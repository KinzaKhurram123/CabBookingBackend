const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");

async function test() {
  try {
    const account = await stripe.accounts.create({
      type: "express",
      email: "test@example.com",
    });
    console.log("Success! Account ID:", account.id);
  } catch (err) {
    console.log("Error:", err.message);
  }
}

test();
