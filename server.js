import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// 🔥 Firebase Admin init
admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
});

const db = admin.firestore();

app.get("/", (req, res) => {
  res.send("Fors Hosting Backend Running 🚀");
});

// 🔥 Webhook Endpoint
app.post("/payment-webhook", async (req, res) => {
  try {

    const { orderId } = req.body;

    if(!orderId){
      return res.status(400).json({ error: "Missing orderId" });
    }

    const orderRef = db.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if(!orderSnap.exists){
      return res.status(404).json({ error: "Order not found" });
    }

    const orderData = orderSnap.data();

    if(orderData.status !== "pending"){
      return res.status(400).json({ error: "Already processed" });
    }

    // 🔥 هنا لاحقاً نحط تحقق الدفع الحقيقي
    const paymentVerified = true;

    if(paymentVerified){

      // 🔵 إنشاء VPS في Vultr
      await fetch("https://api.vultr.com/v2/instances", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + process.env.VULTR_API,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          region: "ams",
          plan: "vc2-1c-2gb",
          os_id: 1743,
          label: `server-${orderId}`
        })
      });

      // 🔥 تحديث الطلب
      await orderRef.update({
        status: "paid",
        paidAt: new Date()
      });

      // 🔥 إضافة السيرفر للمستخدم
      await db.collection("users")
        .doc(orderData.userId)
        .collection("servers")
        .add({
          game: orderData.game,
          status: "deploying",
          createdAt: new Date()
        });

    }

    res.json({ success: true });

  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});