require("dotenv").config();
const { Telegraf } = require("telegraf");
const mongoose = require("mongoose");
const locales = require("./locales");

const { User } = require("./db");

const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper function for localization
function t(language, key, ...args) {
  let text = locales[language][key];
  if (args.length > 0) {
    args.forEach((arg, index) => {
      text = text.replace(new RegExp(`\\{${index}\\}`, "g"), arg);
    });
  }
  return text;
}

function connectToDatabase() {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("Database connected successfully");
    })
    .catch((err) => {
      console.error("Database connection error:", err);
      setTimeout(connectToDatabase, 5000);
    });
}

connectToDatabase();

let userLanguages = {};
let userAnswers = {};

bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const existingUser = await User.findOne({ telegramId: userId });

  if (existingUser) {
    displayUserProfile(existingUser, userId, ctx);
  } else {
    const languageKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t("ua", "languageOptions.ua") || "Ukrainian",
              callback_data: "ua",
            },
          ],
          [
            {
              text: t("pl", "languageOptions.pl") || "Polish",
              callback_data: "pl",
            },
          ],
        ],
      },
    };
    ctx.reply(
      t("pl", "chooseLanguage") || "Choose language:",
      languageKeyboard
    );
  }
});

bot.action(["ua", "pl"], async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const selectedLanguage = ctx.callbackQuery.data;

  let user = await User.findOne({ telegramId: userId });
  if (!user) {
    user = new User({
      telegramId: userId,
      language: selectedLanguage,
    });
    await user.save();
  } else {
    user.language = selectedLanguage;
    await user.save();
  }

  userLanguages[userId] = selectedLanguage;
  userAnswers[userId] = {};

  ctx.reply(t(selectedLanguage, "nameAndSurnameQuestion"));
});

bot.command("language", async (ctx) => {
  const userId = ctx.from.id;
  const languageKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Українська",
            callback_data: "ua",
          },
        ],
        [
          {
            text: "Polski",
            callback_data: "pl",
          },
        ],
      ],
    },
  };
  ctx.reply(
    t(userLanguages[userId] || "pl", "chooseLanguage"),
    languageKeyboard
  );
});

function askGender(ctx, userId) {
  const language = userLanguages[userId];
  const question = t(language, "genderQuestion");
  const genderButtons = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: t(language, "male"), callback_data: "male" },
          { text: t(language, "female"), callback_data: "female" },
        ],
      ],
    },
  };
  ctx.reply(question, genderButtons);
}

function askAge(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "ageQuestion"));
}

function askCity(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "cityQuestion"));
}

function askVoivodeship(ctx, userId) {
  const language = userLanguages[userId];
  const question = t(language, "voivodeshipQuestion");
  const voivodeshipButtons = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "Mazowieckie", callback_data: "Mazowieckie" },
          { text: "Małopolskie", callback_data: "Małopolskie" },
        ],
        [
          { text: "Dolnośląskie", callback_data: "Dolnośląskie" },
          { text: "Wielkopolskie", callback_data: "Wielkopolskie" },
        ],
        [
          { text: "Pomorskie", callback_data: "Pomorskie" },
          { text: "Lubusz", callback_data: "Lubusz" },
        ],
        [
          { text: "Łódzkie", callback_data: "Łódzkie" },
          { text: "Lubelskie", callback_data: "Lubelskie" },
        ],
        [
          { text: "Śląskie", callback_data: "Śląskie" },
          { text: "Opolskie", callback_data: "Opolskie" },
        ],
        [
          { text: "Podkarpackie", callback_data: "Podkarpackie" },
          { text: "Podlaskie", callback_data: "Podlaskie" },
        ],
        [
          { text: "Zachodniopomorskie", callback_data: "Zachodniopomorskie" },
          { text: "Kujawsko-Pomorskie", callback_data: "Kujawsko-Pomorskie" },
        ],
        [
          { text: "Świętokrzyskie", callback_data: "Świętokrzyskie" },
          { text: "Warmińsko-Mazurskie", callback_data: "Warmińsko-Mazurskie" },
        ],
      ],
    },
  };
  ctx.reply(question, voivodeshipButtons);
}

function askProfessions(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "professionsQuestion"));
}

function askExpectedSalary(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "expectedSalaryQuestion"));
}

function askPhone(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "phoneQuestion"));
}

function askEmail(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "emailQuestion"));
}

function askPhoto(ctx, userId) {
  const language = userLanguages[userId];
  ctx.reply(t(language, "photoQuestion"));
}

bot.action(["male", "female"], (ctx) => {
  const userId = ctx.from.id;
  userAnswers[userId].gender = ctx.callbackQuery.data;
  askVoivodeship(ctx, userId);
});

bot.action(
  [
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
  (ctx) => {
    const userId = ctx.from.id;
    userAnswers[userId].voivodeship = ctx.callbackQuery.data;
    askCity(ctx, userId);
  }
);

bot.on("text", (ctx) => {
  const userId = ctx.from.id;
  const message = ctx.message.text;

  if (message.toLowerCase() === "/start") {
    userAnswers[userId] = {};
    ctx.reply(t(userLanguages[userId] || "pl", "start"));
    ctx.reply(t(userLanguages[userId] || "pl", "nameAndSurnameQuestion"));
    return;
  }

  if (!userAnswers[userId].fullName) {
    userAnswers[userId].fullName = message;
    askGender(ctx, userId);
  } else if (!userAnswers[userId].gender) {
    askVoivodeship(ctx, userId);
  } else if (!userAnswers[userId].voivodeship) {
    askCity(ctx, userId);
  } else if (!userAnswers[userId].city) {
    userAnswers[userId].city = message;
    askAge(ctx, userId);
  } else if (!userAnswers[userId].age) {
    userAnswers[userId].age = message;
    askProfessions(ctx, userId);
  } else if (!userAnswers[userId].professions) {
    userAnswers[userId].professions = message;
    askExpectedSalary(ctx, userId);
  } else if (!userAnswers[userId].expectedSalary) {
    userAnswers[userId].expectedSalary = message;
    askPhone(ctx, userId);
  } else if (!userAnswers[userId].phone) {
    userAnswers[userId].phone = message;
    askEmail(ctx, userId);
  } else if (!userAnswers[userId].email) {
    userAnswers[userId].email = message;
    askPhoto(ctx, userId);
  } else {
    userAnswers[userId].photo = message;
    saveUserAnswers(userId, ctx);
  }
});

bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;

  if (!userAnswers[userId]) {
    return ctx.reply(t(userLanguages[userId] || "pl", "formNotStarted"));
  }

  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  userAnswers[userId].photo = fileId;
  saveUserAnswers(userId, ctx);
});

async function saveUserAnswers(userId, ctx) {
  const userData = userAnswers[userId];

  try {
    let user = await User.findOne({ telegramId: userId });

    if (!user) {
      user = new User({
        telegramId: userId,
        ...userData,
      });
    } else {
      Object.assign(user, userData);
    }

    await user.save();
    console.log("User data saved:", user.toObject());
    const language = userLanguages[userId] || user.language || "pl";

    const formattedProfile = `
${user.fullName || t(language, "notSpecified")} ${
      user.age || t(language, "notSpecified")
    } ${
      user.gender === "male"
        ? t(language, "male")
        : user.gender === "female"
        ? t(language, "female")
        : t(language, "notSpecified")
    }
${user.city || t(language, "notSpecified")} ${
      user.voivodeship || t(language, "notSpecified")
    }
${user.professions || t(language, "notSpecified")} ${
      user.expectedSalary || t(language, "notSpecified")
    }
${user.phone || t(language, "notSpecified")} ${
      user.email || t(language, "notSpecified")
    }
    `;

    if (user.photo) {
      await ctx.replyWithPhoto(user.photo, { caption: formattedProfile });
    } else {
      ctx.reply(formattedProfile);
    }
    ctx.reply(t(language, "thanks"));
  } catch (err) {
    console.error("Error saving user data:", err);
    ctx.reply(t(userLanguages[userId] || "pl", "errorSavingData"));
  }
}

async function displayUserProfile(user, userId, ctx) {
  const language = userLanguages[userId] || user.language || "pl";
  const formattedProfile = `
${user.fullName || t(language, "notSpecified")} ${
    user.age || t(language, "notSpecified")
  } ${
    user.gender === "male"
      ? t(language, "male")
      : user.gender === "female"
      ? t(language, "female")
      : t(language, "notSpecified")
  }
${user.city || t(language, "notSpecified")} ${
    user.voivodeship || t(language, "notSpecified")
  }
${user.professions || t(language, "notSpecified")} ${
    user.expectedSalary || t(language, "notSpecified")
  }
${user.phone || t(language, "notSpecified")} ${
    user.email || t(language, "notSpecified")
  }
  `;

  if (user.photo) {
    await ctx.replyWithPhoto(user.photo, { caption: formattedProfile });
  } else {
    ctx.reply(formattedProfile);
  }
  ctx.reply(t(language, "profileViewed"));
}

bot.launch();
