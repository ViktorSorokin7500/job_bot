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

bot.command("refresh", async (ctx) => {
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

bot.command("edit", async (ctx) => {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId });

  if (user) {
    const editKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: t(user.language || "pl", "editName"),
              callback_data: "edit_name",
            },
            {
              text: t(user.language || "pl", "editGender"),
              callback_data: "edit_gender",
            },
          ],
          [
            {
              text: t(user.language || "pl", "editAge"),
              callback_data: "edit_age",
            },
            {
              text: t(user.language || "pl", "editCity"),
              callback_data: "edit_city",
            },
          ],
          [
            {
              text: t(user.language || "pl", "editVoivodeship"),
              callback_data: "edit_voivodeship",
            },
            {
              text: t(user.language || "pl", "editProfessions"),
              callback_data: "edit_professions",
            },
          ],
          [
            {
              text: t(user.language || "pl", "editSalary"),
              callback_data: "edit_salary",
            },
            {
              text: t(user.language || "pl", "editPhone"),
              callback_data: "edit_phone",
            },
          ],
          [
            {
              text: t(user.language || "pl", "editEmail"),
              callback_data: "edit_email",
            },
            {
              text: t(user.language || "pl", "editPhoto"),
              callback_data: "edit_photo",
            },
          ],
        ],
      },
    };
    ctx.reply(t(user.language || "pl", "chooseEdit"), editKeyboard);
  } else {
    ctx.reply(t("pl", "profile_not_found"));
  }
});

bot.action(/^edit_(.+)$/, async (ctx) => {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId });
  const fieldToEdit = ctx.match[1];

  if (user) {
    switch (fieldToEdit) {
      case "name":
        ctx.reply(t(user.language || "pl", "nameAndSurnameQuestion"));
        userAnswers[userId] = { fieldToEdit: "fullName" };
        break;
      case "gender":
        askGender(ctx, userId);
        userAnswers[userId] = { fieldToEdit: "gender" };
        break;
      case "age":
        ctx.reply(t(user.language || "pl", "ageQuestion"));
        userAnswers[userId] = { fieldToEdit: "age" };
        break;
      case "city":
        ctx.reply(t(user.language || "pl", "cityQuestion"));
        userAnswers[userId] = { fieldToEdit: "city" };
        break;
      case "voivodeship":
        askVoivodeship(ctx, userId);
        userAnswers[userId] = { fieldToEdit: "voivodeship" };
        break;
      case "professions":
        ctx.reply(t(user.language || "pl", "professionsQuestion"));
        userAnswers[userId] = { fieldToEdit: "professions" };
        break;
      case "salary":
        ctx.reply(t(user.language || "pl", "expectedSalaryQuestion"));
        userAnswers[userId] = { fieldToEdit: "expectedSalary" };
        break;
      case "phone":
        ctx.reply(t(user.language || "pl", "phoneQuestion"));
        userAnswers[userId] = { fieldToEdit: "phone" };
        break;
      case "email":
        ctx.reply(t(user.language || "pl", "emailQuestion"));
        userAnswers[userId] = { fieldToEdit: "email" };
        break;
      case "photo":
        ctx.reply(t(user.language || "pl", "photoQuestion"));
        userAnswers[userId] = { fieldToEdit: "photo" };
        break;
    }
  } else {
    ctx.reply(t("pl", "profile_not_found"));
  }
});

bot.command("profile", async (ctx) => {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId });

  if (user) {
    await displayUserProfile(user, userId, ctx);
  } else {
    ctx.reply(t("pl", "profile_not_found") || "Profile not found");
  }
});

bot.command("delete", async (ctx) => {
  const userId = ctx.from.id;
  const user = await User.findOne({ telegramId: userId });

  if (user) {
    const confirmationKeyboard = {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text:
                t(user.language || "pl", "confirmDelete") || "Confirm Delete",
              callback_data: "confirm_delete",
            },
          ],
          [
            {
              text: t(user.language || "pl", "cancel") || "Cancel",
              callback_data: "cancel_delete",
            },
          ],
        ],
      },
    };
    ctx.reply(
      t(user.language || "pl", "deleteConfirmation") ||
        "Are you sure you want to delete your profile?",
      confirmationKeyboard
    );
  } else {
    ctx.reply(t("pl", "profile_not_found") || "Profile not found");
  }
});

bot.action("confirm_delete", async (ctx) => {
  const userId = ctx.from.id;
  try {
    const user = await User.findOne({ telegramId: userId });
    if (user) {
      await User.findByIdAndDelete(user._id);
      ctx.reply(
        t(user.language || "pl", "profileDeleted") ||
          "Your profile has been deleted."
      );
    } else {
      ctx.reply(t("pl", "profile_not_found") || "Profile not found");
    }
  } catch (err) {
    console.error("Error deleting user profile:", err);
    ctx.reply(
      t("pl", "errorDeletingProfile") ||
        "Error occurred while deleting profile."
    );
  }
});

bot.action("cancel_delete", (ctx) => {
  ctx.reply(
    t(
      ctx.from.id in userLanguages ? userLanguages[ctx.from.id] : "pl",
      "deleteCancelled"
    ) || "Deletion cancelled."
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

bot.on("text", async (ctx) => {
  // Объявляем обработчик как асинхронный
  const userId = ctx.from.id;
  const message = ctx.message.text;

  if (
    message.toLowerCase() === "/start" ||
    message.toLowerCase() === "/profile"
  ) {
    const user = await User.findOne({ telegramId: userId });
    if (user) {
      await displayUserProfile(user, userId, ctx);
    } else {
      userAnswers[userId] = {};
      ctx.reply(t(userLanguages[userId] || "pl", "start"));
      ctx.reply(t(userLanguages[userId] || "pl", "nameAndSurnameQuestion"));
    }
    return;
  }

  if (
    message === t(userLanguages[userId] || "pl", "viewVacancies") ||
    message === "View Vacancies"
  ) {
    await showVacanciesForUser(userId, ctx);
    return;
  }

  if (userAnswers[userId] && userAnswers[userId].fieldToEdit) {
    const field = userAnswers[userId].fieldToEdit;
    userAnswers[userId] = {};

    try {
      const user = await User.findOne({ telegramId: userId });
      if (user) {
        user[field] = message;
        await user.save();
        ctx.reply(t(user.language || "pl", "fieldUpdated", field));
        await displayUserProfile(user, userId, ctx); // Используем await, если displayUserProfile асинхронная
      } else {
        ctx.reply(t("pl", "profile_not_found"));
      }
    } catch (err) {
      console.error("Error updating user data:", err);
      ctx.reply(t(userLanguages[userId] || "pl", "errorSavingData"));
    }
  } else if (!userAnswers[userId].fullName) {
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
    await saveUserAnswers(userId, ctx); // Используем await, так как saveUserAnswers асинхронная
  }
});

bot.on("photo", async (ctx) => {
  const userId = ctx.from.id;

  if (!userAnswers[userId]) {
    return ctx.reply(t(userLanguages[userId] || "pl", "formNotStarted"));
  }

  if (userAnswers[userId].fieldToEdit === "photo") {
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    try {
      const user = await User.findOne({ telegramId: userId });
      if (user) {
        user.photo = fileId;
        await user.save();
        ctx.reply(t(user.language || "pl", "fieldUpdated", "photo"));
        displayUserProfile(user, userId, ctx);
      } else {
        ctx.reply(t("pl", "profile_not_found"));
      }
    } catch (err) {
      console.error("Error updating user photo:", err);
      ctx.reply(t(userLanguages[userId] || "pl", "errorSavingData"));
    }
  } else {
    // Если это не редактирование фото, продолжаем с обычной логикой
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    userAnswers[userId].photo = fileId;
    saveUserAnswers(userId, ctx);
  }
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
    // Сохраняем пользователя в базу данных
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

    // Отображаем профиль
    // if (user.photo) {
    //   await ctx.replyWithPhoto(user.photo, { caption: formattedProfile });
    // } else {
    //   ctx.reply(formattedProfile);
    // }
    ctx.reply(t(language, "thanks"));

    // Вызываем displayUserProfile после сохранения и отображения профиля
    await displayUserProfile(user, userId, ctx);
  } catch (err) {
    console.error("Error saving user data:", err);
    ctx.reply(t(userLanguages[userId] || "pl", "errorSavingData"));
  }
}

async function displayUserProfile(user, userId, ctx) {
  const language = user.language || "pl";
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
    await ctx.replyWithPhoto(user.photo, {
      caption: formattedProfile,
      reply_markup: {
        keyboard: [
          [
            {
              text: t(language, "viewVacancies") || "View Vacancies",
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  } else {
    ctx.reply(formattedProfile, {
      reply_markup: {
        keyboard: [
          [
            {
              text: t(language, "viewVacancies") || "View Vacancies",
            },
          ],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  }
  ctx.reply(t(language, "profileViewed"));
}

bot.launch();
