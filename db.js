const mongoose = require("mongoose");
require("dotenv").config();

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  fullName: String,
  phone: Number,
  interested: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  declined: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  photo: { type: String },
  gender: { type: String, enum: ["male", "female"] },
  age: { type: Number },
  city: { type: String },
  voivodeship: {
    type: String,
    enum: [
      "Mazowieckie",
      "Małopolskie",
      "Dolnośląskie",
      "Wielkopolskie",
      "Pomorskie",
      "Lubusz",
      "Łódzkie",
      "Lubelskie",
      "Śląskie",
      "Opolskie",
      "Podkarpackie",
      "Podlaskie",
      "Zachodniopomorskie",
      "Kujawsko-Pomorskie",
      "Świętokrzyskie",
      "Warmińsko-Mazurskie",
    ],
  },
  professions: { type: String },
  expectedSalary: { type: Number },
  phone: { type: String },
  email: { type: String },
  checked: {
    type: String,
    enum: ["selected", "unselected"],
    default: "unselected",
  },
  language: { type: String, enum: ["ua", "pl"], default: "pl" },
  createdAt: { type: Date, default: Date.now },
});

const jobSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  salary: String,
  city: String,
  voivodeship: {
    type: String,
    enum: [
      "Mazowieckie",
      "Małopolskie",
      "Dolnośląskie",
      "Wielkopolskie",
      "Pomorskie",
      "Lubusz",
      "Łódzkie",
      "Lubelskie",
      "Śląskie",
      "Opolskie",
      "Podkarpackie",
      "Podlaskie",
      "Zachodniopomorskie",
      "Kujawsko-Pomorskie",
      "Świętokrzyskie",
      "Warmińsko-Mazurskie",
    ],
    required: true,
  },
  responsibilities: [String],
  bonuses: [String],
  views: [{ type: Number, ref: "User" }],
});

const User = mongoose.model("User", userSchema);
const Job = mongoose.model("Job", jobSchema);

module.exports = { User, Job };

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));
