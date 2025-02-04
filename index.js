const { Telegraf, session } = require("telegraf");
const mongoose = require("mongoose");
const { User, Job } = require("./db");
const express = require("express");
const locales = require("./locales");
require("dotenv").config();
const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);
const { getUpdatedPhotoUrl } = require("./photoUtils");
const { sendMail } = require("./sendEmails");

bot.use(session());

const voivodeships = [
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
];

async function saveUserData(user, field, value) {
  if (field === "voivodeship") {
    console.log("Trying to save voivodeship:", value);
  }
  user[field] = value;
  try {
    await user.save();
    console.log(`Поле ${field} збережено.`);
    return true;
  } catch (error) {
    console.error(`Хиба при збереженні поля ${field}:`, error);
    return false;
  }
}

async function displayProfile(ctx, user) {
  const t = locales[user.language];
  let profileText = t.profileDisplay
    .replace("{{photo}}", user.photo ? t.download : t.notload)
    .replace("{{fullName}}", user.fullName || t.notload)
    .replace("{{age}}", user.age || t.notload)
    .replace("{{gender}}", user.gender || t.notload)
    .replace("{{voivodeship}}", user.voivodeship || t.notload)
    .replace("{{city}}", user.city || t.notload)
    .replace("{{professions}}", user.professions || t.notload)
    .replace("{{salary}}", user.expectedSalary || t.notload)
    .replace("{{phone}}", user.phone || t.notload)
    .replace("{{email}}", user.email || t.notload);

  if (user.photo) {
    ctx.replyWithPhoto({ url: user.photo }, { caption: profileText });
  } else {
    ctx.reply(profileText);
  }
}

bot.command("edit", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.editProfile, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.chooseLanguage, callback_data: "editLanguage" }],
          [{ text: t.fullName, callback_data: "editFullName" }],
          [{ text: t.age, callback_data: "editAge" }],
          [{ text: t.gender, callback_data: "editGender" }],
          [{ text: t.voivodeship, callback_data: "editVoivodeship" }],
          [{ text: t.city, callback_data: "editCity" }],
          [{ text: t.professions, callback_data: "editProfessions" }],
          [{ text: t.salary, callback_data: "editSalary" }],
          [{ text: t.email, callback_data: "editEmail" }],
          [{ text: t.phone, callback_data: "editPhone" }],
          [{ text: t.photo, callback_data: "editPhoto" }],
        ],
      },
    });
  }
});

bot.command("delete", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.deleteConfirm, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.confirmDelete, callback_data: "confirmDelete" }],
          [{ text: t.cancelDelete, callback_data: "cancelDelete" }],
        ],
      },
    });
  } else {
    const t = locales["pl"];
    ctx.reply(t.userNotFound);
  }
});

bot.command("vacancies", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    let jobs = await Job.find({ voivodeship: user.voivodeship });

    const excludeIds = [
      ...(user.interested || []),
      ...(user.bookmarks || []),
      ...(user.declined || []),
    ].map((id) => new mongoose.Types.ObjectId(id));

    jobs = jobs.filter(
      (job) => !excludeIds.some((excludeId) => excludeId.equals(job._id))
    );

    if (jobs.length > 0) {
      ctx.session.jobs = jobs;
      ctx.session.currentJobIndex = 0;
      displayJob(ctx, user);
    } else {
      const t = locales[user.language];
      ctx.reply(t.noJobInVoivodoship);
    }
  }
});

bot.command("bookmarks", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user && user.bookmarks.length > 0) {
    const bookmarks = await Job.find({ _id: { $in: user.bookmarks } });
    ctx.session.jobs = bookmarks;
    ctx.session.currentJobIndex = 0;
    displayBookmark(ctx, user);
  } else {
    const t = locales[user.language];
    ctx.reply(t.noBookmarks);
  }
});

function displayBookmark(ctx, user) {
  if (!ctx.session) ctx.session = {};
  const t = locales[user.language];
  if (ctx.session.currentJobIndex < ctx.session.jobs.length) {
    const job = ctx.session.jobs[ctx.session.currentJobIndex];
    let jobText = `*${escapeMarkdownV2(job.name)}*\n\n${escapeMarkdownV2(
      job.description
    )}\n\n${t.salary}: ${escapeMarkdownV2(job.salary.toString())}\n${
      t.city
    }: ${escapeMarkdownV2(job.city)}\n${t.voivodeship}: ${escapeMarkdownV2(
      job.voivodeship
    )}\n${t.responsibilities}: ${job.responsibilities
      .map(escapeMarkdownV2)
      .join(", ")}\n${t.bonuses}: ${job.bonuses
      .map(escapeMarkdownV2)
      .join(", ")}`;
    ctx.reply(jobText, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [{ text: t.apply, callback_data: `bookmarkApply-${job._id}` }],
          [
            {
              text: t.notInterested,
              callback_data: `bookmarkDecline-${job._id}`,
            },
          ],
        ],
      },
    });
  } else {
    ctx.reply(t.noBookmarks);
  }
}

function escapeMarkdownV2(text) {
  return text.replace(/[-_.!~>()#+]/g, "\\$&");
}

function displayJob(ctx, user) {
  if (!ctx.session) ctx.session = {};
  const t = locales[user.language];
  if (ctx.session.currentJobIndex < ctx.session.jobs.length) {
    const job = ctx.session.jobs[ctx.session.currentJobIndex];
    let jobText = `*${escapeMarkdownV2(job.name)}*\n\n${escapeMarkdownV2(
      job.description
    )}\n\n${t.salary}: ${escapeMarkdownV2(job.salary.toString())}\n${
      t.city
    }: ${escapeMarkdownV2(job.city)}\n${t.voivodeship}: ${escapeMarkdownV2(
      job.voivodeship
    )}\n${t.responsibilities}: ${job.responsibilities
      .map(escapeMarkdownV2)
      .join(", ")}\n${t.bonuses}: ${job.bonuses
      .map(escapeMarkdownV2)
      .join(", ")}`;
    ctx.reply(jobText, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [{ text: t.apply, callback_data: `apply-${job._id}` }],
          [{ text: t.bookmark, callback_data: `bookmark-${job._id}` }],
          [{ text: t.notInterested, callback_data: `decline-${job._id}` }],
        ],
      },
    });
  } else {
    ctx.reply(t.noJobInVoivodoship);
  }
}

bot.action(/^apply-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1];
  const t = locales[user.language];
  if (user && !user.interested.includes(jobId)) {
    user.interested.push(jobId);
    await user.save();

    const job = await Job.findById(jobId);
    if (job) {
      try {
        await sendMail(
          `Zgłoszenie na ofertę pracy: ${job.name}`,
          `Użytkownik ${user.fullName} jest zainteresowany ofertą pracy ${job.name}. Kontakt: TelegramId: ${user.telegramId}, Telefon: ${user.phone}, E-mail: ${user.email}.`
        );
        ctx.reply(t.appliedSuccess);
      } catch (error) {
        console.error("Хиба", error);
        ctx.reply(t.error);
      }
    } else {
      ctx.reply(t.vacancyNotFound);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply(t.alreadyApplied);
  }
});

bot.action(/^bookmarkApply-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1];
  const t = locales[user.language];
  if (user) {
    const jobObjectId = new mongoose.Types.ObjectId(jobId);
    if (
      user.bookmarks.some((id) => id.equals(jobObjectId)) &&
      !user.interested.some((id) => id.equals(jobObjectId))
    ) {
      user.interested.push(jobObjectId);
      user.bookmarks = user.bookmarks.filter((id) => !id.equals(jobObjectId));
      await user.save();

      ctx.session.jobs = await Job.find({ _id: { $in: user.bookmarks } });
      ctx.session.currentJobIndex = 0;

      const job = await Job.findById(jobObjectId);
      if (job) {
        try {
          await sendMail(
            `Zgłoszenie na ofertę pracy: ${job.name}`,
            `Użytkownik ${user.fullName} jest zainteresowany ofertą pracy ${job.name} (${job.city}). Kontakt: Telefon: ${user.phone}, E-mail: ${user.email}.`
          );
          ctx.reply(t.appliedSuccess);
        } catch (error) {
          console.error("Хиба:", error);
          ctx.reply(t.error);
        }
      } else {
        ctx.reply(t.vacancyNotFound);
      }
    } else if (user.interested.some((id) => id.equals(jobObjectId))) {
      ctx.reply(t.alreadyApplied);
    } else {
      ctx.reply(t.error);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
    displayBookmark(ctx, user);
  }
});

bot.action(/^bookmark-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];
  const jobId = ctx.match[1];
  if (user && !user.bookmarks.includes(jobId)) {
    user.bookmarks.push(jobId);
    await user.save();
    const t = locales[user.language];
    ctx.reply(t.bookmarkedSuccess);
    await new Promise((resolve) => setTimeout(resolve, 750));
    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply(t.alreadyBookmarked);
  }
});

bot.action(/^decline-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];
  const jobId = ctx.match[1];
  if (user && !user.declined.includes(jobId)) {
    user.declined.push(jobId);
    await user.save();
    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply(t.alreadyDecided);
  }
});

bot.action(/^bookmarkDecline-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];
  const jobId = ctx.match[1];
  if (user) {
    const jobObjectId = new mongoose.Types.ObjectId(jobId);
    if (
      user.bookmarks.some((id) => id.equals(jobObjectId)) &&
      !user.declined.some((id) => id.equals(jobObjectId))
    ) {
      user.declined.push(jobObjectId);
      user.bookmarks = user.bookmarks.filter((id) => !id.equals(jobObjectId));
      await user.save();

      ctx.session.jobs = await Job.find({ _id: { $in: user.bookmarks } });
      ctx.session.currentJobIndex = 0;

      displayBookmark(ctx, user);
    } else if (user.declined.some((id) => id.equals(jobObjectId))) {
      ctx.reply(t.alreadyDecided);
    } else {
      ctx.reply(t.vacancyNotFound);
    }
  }
});

bot.action("confirmDelete", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];
  if (user) {
    try {
      await User.deleteOne({ telegramId: ctx.from.id });
      const t = locales[user.language];
      ctx.reply(t.profileDeleted);
      ctx.session = {};
    } catch (error) {
      console.error("Хиба", error);
      ctx.reply(t.errorDelete);
    }
  } else {
    ctx.reply(t.userNotFound);
  }
});

bot.action("cancelDelete", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];
  if (user) {
    ctx.reply(t.deleteCanceled);
    await displayProfile(ctx, user);
  } else {
    ctx.reply(t.userNotFound);
  }
});

bot.start(async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    await displayProfile(ctx, user);
  } else {
    const newUser = new User({
      telegramId: ctx.from.id,
      language: "pl",
    });
    await newUser.save();
    const t = locales["pl"];
    ctx.reply(t.chooseLanguage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Polski", callback_data: "pl" }],
          [{ text: "Українська", callback_data: "ua" }],
        ],
      },
    });
  }
});

bot.action(["pl", "ua"], async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const saved = await saveUserData(user, "language", ctx.match[0]);
    if (saved) {
      const t = locales[user.language];
      ctx.reply(t.nameQuestion);
    }
  }
});

bot.on("text", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];

    // Заполнение профиля
    if (!user.fullName) {
      if (/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text)) {
        const saved = await saveUserData(user, "fullName", ctx.message.text);
        if (saved) {
          ctx.reply(t.genderQuestion, {
            reply_markup: {
              inline_keyboard: [
                [{ text: t.male, callback_data: "male" }],
                [{ text: t.female, callback_data: "female" }],
              ],
            },
          });
        }
      } else {
        ctx.reply(t.nameQuestion);
      }
    } else if (!user.gender) {
      ctx.reply("You shall no pass");
    } else if (!user.age) {
      if (/^\d+$/.test(ctx.message.text)) {
        const saved = await saveUserData(
          user,
          "age",
          parseInt(ctx.message.text)
        );
        if (saved) {
          const keyboard = voivodeships.map((v) => [
            { text: v, callback_data: v },
          ]);
          ctx.reply(t.voivodeshipQuestion, {
            reply_markup: { inline_keyboard: keyboard },
          });
        }
      } else {
        ctx.reply(t.ageQuestion);
      }
    } else if (!user.voivodeship) {
      ctx.reply("You shall no pass");
    } else if (!user.city) {
      if (/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text)) {
        const saved = await saveUserData(user, "city", ctx.message.text);
        if (saved) {
          ctx.reply(t.professionsQuestion);
        }
      } else {
        ctx.reply(t.cityQuestion);
      }
    } else if (!user.professions) {
      if (/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s,]+$/.test(ctx.message.text)) {
        const saved = await saveUserData(user, "professions", ctx.message.text);
        if (saved) {
          ctx.reply(t.salaryQuestion);
        }
      } else {
        ctx.reply(t.professionsQuestion);
      }
    } else if (!user.expectedSalary) {
      if (/^\d+$/.test(ctx.message.text)) {
        const saved = await saveUserData(
          user,
          "expectedSalary",
          parseInt(ctx.message.text)
        );
        if (saved) {
          ctx.reply(t.emailQuestion);
        }
      } else {
        ctx.reply(t.salaryQuestion);
      }
    } else if (!user.email) {
      const saved = await saveUserData(user, "email", ctx.message.text);
      if (saved) {
        ctx.reply(t.phoneQuestion);
      }
    } else if (!user.phone) {
      const saved = await saveUserData(user, "phone", ctx.message.text);
      if (saved) {
        ctx.reply(t.photoQuestion);
      }
    } else {
      if (ctx.session.editField) {
        let isValid = true;
        switch (ctx.session.editField) {
          case "fullName":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text);
            break;
          case "age":
            isValid = /^\d+$/.test(ctx.message.text);
            if (isValid) ctx.message.text = parseInt(ctx.message.text);
            break;
          case "city":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text);
            break;
          case "professions":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s,]+$/.test(ctx.message.text);
            break;
          case "expectedSalary":
            isValid = /^\d+$/.test(ctx.message.text);
            if (isValid) ctx.message.text = parseInt(ctx.message.text);
            break;
        }

        if (isValid) {
          const fieldToSave =
            ctx.session.editField === "expectedSalary"
              ? "expectedSalary"
              : ctx.session.editField;
          const saved = await saveUserData(user, fieldToSave, ctx.message.text);
          if (saved) {
            ctx.reply(`${ctx.session.editField} updated`);
            ctx.session.editField = null;
            await displayProfile(ctx, user);
          }
        } else {
          ctx.reply(t[`${ctx.session.editField}Question`]);
        }
      }
    }
  }
});

bot.action(["male", "female"], async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user && !user.gender) {
    const t = locales[user.language];
    const saved = await saveUserData(user, "gender", ctx.match[0]);
    if (saved) {
      ctx.reply(t.ageQuestion);
    }
  }
});

bot.action(voivodeships, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user && !user.voivodeship) {
    const t = locales[user.language];
    const saved = await saveUserData(user, "voivodeship", ctx.match[0]);
    if (saved) {
      ctx.reply(t.cityQuestion);
    }
  }
});

bot.on("photo", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const photoUrl = await getUpdatedPhotoUrl(photo.file_id, bot);
    if (photoUrl) {
      if (!user.photo) {
        const saved = await saveUserData(user, "photo", photoUrl);
        if (saved) {
          await displayProfile(ctx, user);
        }
      } else if (ctx.session.editField === "photo") {
        const saved = await saveUserData(user, "photo", photoUrl);
        if (saved) {
          ctx.session.editField = null;
          await displayProfile(ctx, user);
        }
      } else {
        ctx.reply(t.photoDownload);
      }
    } else {
      ctx.reply(t.photoQuestion);
    }
  }
});

bot.action("editLanguage", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.chooseLanguage, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Polski", callback_data: "setLanguage-pl" }],
          [{ text: "Українська", callback_data: "setLanguage-ua" }],
        ],
      },
    });
  }
});

bot.action(["setLanguage-pl", "setLanguage-ua"], async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const [, newLanguage] = ctx.match[0].split("-");
    const saved = await saveUserData(user, "language", newLanguage);
    if (saved) {
      ctx.reply(
        `Język zmieniony na ${newLanguage === "pl" ? "polski" : "ukraiński"}.`
      );
      await displayProfile(ctx, user);
    } else {
      ctx.reply("Błąd przy zmianie języka. Spróbuj ponownie.");
    }
  }
});

bot.action("editFullName", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.nameQuestion);
    ctx.session.editField = "fullName";
  }
});

bot.action("editAge", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.ageQuestion);
    ctx.session.editField = "age";
  }
});

bot.action("editGender", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    if (!ctx.session) ctx.session = {};
    ctx.session.editField = "gender";
    ctx.reply(t.genderQuestion, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.male, callback_data: "setGender-male" }],
          [{ text: t.female, callback_data: "setGender-female" }],
        ],
      },
    });
  }
});

bot.action(["setGender-male", "setGender-female"], async (ctx) => {
  if (!ctx.session) ctx.session = {};

  const user = await User.findOne({ telegramId: ctx.from.id });
  const t = locales[user.language];

  if (user) {
    const [, newGender] = ctx.match[0].split("-");
    const saved = await saveUserData(user, "gender", newGender);
    if (saved) {
      if (!ctx.session.editField) ctx.session.editField = "gender";

      if (ctx.session.editField === "gender") {
        ctx.reply(t.genderUpdated.replace("{{gender}}", newGender));
        ctx.session.editField = null;
        await displayProfile(ctx, user);
      } else {
        ctx.reply(t.errorUpdatingGender);
      }
    } else {
      ctx.reply(t.errorUpdatingGender);
    }
  }
});

bot.action("editVoivodeship", async (ctx) => {
  console.log("first");

  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    const keyboard = voivodeships.map((v) => [
      { text: v, callback_data: `setVoivodeship-${v}` },
    ]);
    ctx.reply(t.voivodeshipQuestion, {
      reply_markup: { inline_keyboard: keyboard },
    });
    ctx.session.editField = "voivodeship";
  }
});

bot.action(
  voivodeships.map((v) => `setVoivodeship-${v}`),
  async (ctx) => {
    const user = await User.findOne({ telegramId: ctx.from.id });
    const t = locales[user.language];
    if (user && ctx.session.editField === "voivodeship") {
      // Извлекаем воеводство, убирая префикс 'setVoivodeship-'
      const newVoivodeship = ctx.match[0].replace("setVoivodeship-", "");
      console.log("Attempting to save voivodeship:", newVoivodeship);
      const saved = await saveUserData(user, "voivodeship", newVoivodeship);
      if (saved) {
        ctx.reply(
          t.voivodeshipUpdated.replace("{{voivodeship}}", newVoivodeship)
        );
        ctx.session.editField = null;
        await displayProfile(ctx, user);
      } else {
        ctx.reply(t.errorUpdatingVoivodeship);
      }
    }
  }
);

bot.action("editCity", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.cityQuestion);
    ctx.session.editField = "city";
  }
});

bot.action("editProfessions", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.professionsQuestion);
    ctx.session.editField = "professions";
  }
});

bot.action("editSalary", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.salaryQuestion);
    ctx.session.editField = "expectedSalary";
  }
});

bot.action("editEmail", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.emailQuestion);
    ctx.session.editField = "email";
  }
});

bot.action("editPhone", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.phoneQuestion);
    ctx.session.editField = "phone";
  }
});

bot.action("editPhoto", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.photoQuestion);
    ctx.session.editField = "photo";
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

app.get("/", (req, res) => {
  console.log("Mmm... I’m Mr. Frundles");
  res.send("Bot is running!");
});

const PORT = process.env.PORT || 443;
app.listen(PORT, () => {
  console.log(`Server is running`);
});
