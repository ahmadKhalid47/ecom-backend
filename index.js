const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const PayPal = require("paypal-rest-sdk");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const frontendKey = process.env.FRONTEND_KEY;
const mongodbKey = process.env.MONGODB_KEY;
console.log(frontendKey, "Front End Key");
console.log(mongodbKey, "MongoDb Key");

PayPal.configure({
  mode: "sandbox",
  client_id:
    "ARHVyRMV-BhW1-yXbgeZtH6X7TSoHaXVjtQ2KJvggsLFD2PvyayH21zctMf5zxr1DHH4_fZrxra_5hhZ",
  client_secret:
    "EGZqcNaTQ_BWgLueMXtdcpoiUD67nfb2Sy9W5n-U8hYzEPEnq5VvNNDvr5-3Upal2-N1Dhb-Iq3Uz5YV",
});

app.use(
  cors({
    origin: frontendKey,
  })
);
app.use(bodyParser.json());

mongoose.connect(mongodbKey);

cloudinary.config({
  cloud_name: "dcdynkm5d",
  api_key: "157745433978489",
  api_secret: "AqvKiU623z4vCZStGiBvBgk-2vQ",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    format: (req, res) => "png",
  },
});

const upload = multer({
  storage: storage,
});

const regSchema = mongoose.Schema({
  email: String,
  password: String,
  cart: Array,
});

const productsSchema = mongoose.Schema({
  Image: String,
  Details: String,
  Quantity: Number,
  Price: Number,
  Brand: String,
  Color: String,
  Sold: Number,
  Rating: Object,
});

const orderSchema = mongoose.Schema({
  user_id: String,
  product_Image: String,
  product_Detail: String,
  product_id: String,
  name: String,
  phone: Number,
  address: String,
  link: String,
});

const demy_orderSchema = mongoose.Schema({
  user_id: String,
  product_Image: String,
  product_Detail: String,
  product_id: String,
  name: String,
  phone: Number,
  address: String,
  link: String,
});

const notification_Schema = mongoose.Schema({
  image: String,
  date: String,
  detail: String,
  user_id: String,
});

const rating_Schema = mongoose.Schema({
  product_id: String,
  rate: Number,
  users: Array,
});

const productsModel = mongoose.model("product", productsSchema);
const regModel = mongoose.model("account", regSchema);
const orderModel = mongoose.model("order", orderSchema);
const demy_orderModel = mongoose.model("demy_order", demy_orderSchema);
const notification_Model = mongoose.model("notification", notification_Schema);
const ratingModel = mongoose.model("rating", rating_Schema);

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.post("/login", async (req, res) => {
  var email = req.body.email;
  const password = req.body.password;
  const data = await regModel.findOne({ email: email });

  if (!data) {
    res.json({ error: "you dont have an account" });
  } else {
    if (password != data.password) {
      res.json({ error: "incorrect password" });
    } else {
      res.json({ data: data._id });
    }
  }
});

app.post("/signUp", async (req, res) => {
  var email = req.body.email;
  const password = req.body.password;
  const data = await regModel.findOne({ email: email });

  if (!data) {
    await regModel({
      email: email,
      password: password,
      cart: [],
    }).save();
    const tempData = await regModel.findOne({ email: email });
    res.json({ data: tempData._id });
  } else {
    res.json({ error: "you have already signed in" });
  }
});
app.post("/admin", upload.single("image"), async (req, res) => {
  const image = req.file.path;
  const { details } = req.body;
  const { quantity } = req.body;
  const { price } = req.body;
  const { brand } = req.body;
  const { color } = req.body;
  await productsModel({
    Image: image,
    Details: details,
    Quantity: quantity,
    Price: price,
    Brand: brand,
    Color: color,
    Rating: {
      actualRating: 0,
      ratingCount: 0,
    },
  }).save();

  res.json({ message: "file uploaded" });
});

app.get("/admin", async (req, res) => {
  const products = await productsModel.find();
  const orders = await orderModel.find();
  products, orders, res.json({ products, orders });
});

app.get("/home", async (req, res) => {
  const homeDetails = await productsModel.find();
  res.json(homeDetails);
});

app.get("/productDetails/:_id/:userId", async (req, res) => {
  const { userId, _id } = req.params;
  const product = await productsModel.findOne({ _id: _id });
  const { cart } = await regModel.findOne({ _id: userId });
  if (cart.includes(_id)) {
    var cartCheck = true;
  } else {
    var cartCheck = false;
  }
  if (product) {
    res.json({ product, cartCheck });
  } else {
    res.json({ error: "sorry! this product is Out of Stock" });
  }
});

app.post("/addToCart/:productId/:_id", async (req, res) => {
  const { _id, productId } = req.params;
  await regModel.updateOne({ _id: _id }, { $push: { cart: productId } });
  res.json({ data: "all set" });
});

app.get("/carts/:userId", async (req, res) => {
  const { userId } = req.params;
  const { cart } = await regModel.findOne({ _id: userId });
  const cartData = [];
  for (let i = 0; i < cart.length; i++) {
    const cartMember = await productsModel.findOne({ _id: cart[i] });
    cartData.push(cartMember);
  }
  res.json({ carts: cartData });
});

app.delete("/removeCart/:cartId/:userId", async (req, res) => {
  const { cartId, userId } = req.params;
  await regModel.updateOne({ _id: userId }, { $pull: { cart: cartId } });
  res.json({ data: "removed" });
});

app.post("/buy/:productId/:userId", async (req, res) => {
  const { productId, userId } = req.params;
  const { name, phone, address } = req.body;
  try {
    const product = await productsModel.findOne({
      _id: productId,
    });
    const { Image, Details, Price } = product;
    let demy_order = await demy_orderModel({
      product_Detail: Details,
      product_Image: Image,
      product_id: productId,
      user_id: userId,
      name: name,
      phone: phone,
      address: address,
    }).save();

    const payment = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: `${frontendKey}/success/${demy_order._id}`,
        cancel_url: `${frontendKey}/buy/${productId}`,
      },
      transactions: [
        {
          amount: {
            total: Price,
            currency: "USD",
          },
          description: "your description goes here",
        },
      ],
    };

    PayPal.payment.create(payment, (error, payment) => {
      if (error) {
        res.json({ url: "error" });
      } else {
        for (let i = 0; i < payment.links.length; i++) {
          if (payment.links[i].rel === "approval_url") {
            res.json({ url: payment.links[i].href });
          }
        }
      }
    });
  } catch {
    res.json({ url: "error" });
  }
});

app.get("/success/:demyId", async (req, res) => {
  const demy_order = await demy_orderModel.findOne({
    _id: req.params.demyId,
  });
  const {
    product_Detail,
    product_Image,
    product_id,
    user_id,
    name,
    phone,
    address,
  } = demy_order;

  await orderModel({
    product_Detail,
    product_Image,
    product_id,
    user_id,
    name,
    phone,
    address,
  }).save();
  const conditions = {
    product_id: product_id,
    user_id: user_id,
  };
  await demy_orderModel.deleteMany(conditions);
  await productsModel.updateOne(
    { _id: product_id },
    { $inc: { Quantity: -1 } }
  );
  const product = await productsModel.findOne({
    _id: product_id,
  });
  if (product.Quantity <= 0) {
    await productsModel.deleteMany({ _id: product_id });
  }
  res.json({ data: "success" });
});

app.delete("/toDelete/:orderId", async (req, res) => {
  const { orderId } = req.params;
  await productsModel.deleteMany({ _id: orderId });
  res.json({ data: "delted" });
});

app.post("/delivered/:order_id", async (req, res) => {
  const { order_id } = req.params;
  const { user_id, product_Detail, product_Image } = await orderModel.findOne({
    _id: order_id,
  });
  const date =
    new Date().getDate() +
    "/" +
    (new Date().getMonth() + 1) +
    "/" +
    new Date().getFullYear();

  await notification_Model({
    image: product_Image,
    detail: product_Detail,
    date,
    user_id,
  }).save();

  await orderModel.deleteMany({ _id: order_id });
  res.json({ data: "delivered" });
});

app.get("/notification/:_id", async (req, res) => {
  const { _id } = req.params;
  const notificationData = await notification_Model.find({
    user_id: _id,
  });

  var info_obj = {};
  if (notificationData) {
    const check = new Array(notificationData.length);
    for (let i = 0; i < notificationData.length; i++) {
      const product = await productsModel.findOne({
        Details: notificationData[i].detail,
      });
      if (!product) {
        check[i] = "none";
      } else {
        const rating = await ratingModel.findOne({ product_id: product._id });
        if (rating) {
          if (!rating.users.includes(_id)) {
            check[i] = "display";
          } else {
            check[i] = "none";
          }
        }
      }
    }

    info_obj = {
      _id: _id,
      notification: notificationData,
      checker: check,
    };
    res.json({ notificationData });
  } else {
    info_obj = {
      _id: _id,
    };
    res.json({ info_obj });
  }
});

app.post("/rating/:productId", async (req, res) => {
  const { productId } = req.params;
  const { ratingValue } = req.body;

  let { Rating } = await productsModel.findOne({ Details: productId });
  let { ratingCount, actualRating } = Rating;
  let ratingObj = {
    actualRating:
      (ratingValue + actualRating * ratingCount) / (ratingCount + 1),
    ratingCount: ratingCount + 1,
  };

  await productsModel.updateOne(
    { Details: productId },
    { $set: { Rating: ratingObj } }
  );

  res.json({ productId: productId });
});

app.listen(port, () => {
  console.log("ok");
});
