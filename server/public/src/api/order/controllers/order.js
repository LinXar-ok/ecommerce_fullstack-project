// order.js
"use strict";
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, userName, email } = ctx.request.body;

    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);

          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      const session = await stripe.checkout.sessions.create(
        {
          payment_method_types: ["card"], // Note: It's payment_method_types not payment_method_type
          customer_email: email,
          mode: "payment",
          success_url: "http://localhost:3000/checkout/success",
          cancel_url: "http://localhost:3000",
          line_items: lineItems,
        },
        console.log("🚀 ~ file: order.js:45 ~ create ~ lineItems:", lineItems)
      );

      console.log("🚀 ~ file: order.js:46 ~ create ~ session:", session);

      await strapi.service("api::order.order").create({
        data: { userName, products, stripeSessionId: session.id },
      });

      return { id: session.id };
    } catch (stripeError) {
      ctx.response.status = 500;
      return {
        error: {
          message:
            "There was a problem creating the charge. " + stripeError.message,
        },
      };
    }
  },
}));
