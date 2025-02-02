const { Telegraf, session } = require("telegraf");
const mongoose = require("mongoose");
const { User, Job } = require("./db");
const locales = require("./locales");
require("dotenv").config();
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
  user[field] = value;
  try {
    await user.save();
    console.log(`Поле ${field} успешно сохранено.`);
    return true;
  } catch (error) {
    console.error(`Ошибка при сохранении поля ${field}:`, error);
    return false;
  }
}

async function displayProfile(ctx, user) {
  const t = locales[user.language];
  let profileText = t.profileDisplay
    .replace("{{photo}}", user.photo ? "Загружено" : "Не загружено")
    .replace("{{fullName}}", user.fullName || "Не указано")
    .replace("{{age}}", user.age || "Не указано")
    .replace("{{gender}}", user.gender || "Не указано")
    .replace("{{voivodeship}}", user.voivodeship || "Не указано")
    .replace("{{city}}", user.city || "Не указано")
    .replace("{{professions}}", user.professions || "Не указано")
    .replace("{{salary}}", user.expectedSalary || "Не указано")
    .replace("{{phone}}", user.phone || "Не указано")
    .replace("{{email}}", user.email || "Не указано");

  if (user.photo) {
    ctx.replyWithPhoto({ url: user.photo }, { caption: profileText });
  } else {
    ctx.reply(profileText);
  }
}

// Регистрируем команду edit в начале
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
    ctx.reply(
      "Пользователь не найден. Возможно, у вас нет профиля для удаления."
    );
  }
});

bot.command("vacancies", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    let jobs = await Job.find({ voivodeship: user.voivodeship });

    // Создаем массив ObjectId для исключения
    const excludeIds = [
      ...(user.interested || []),
      ...(user.bookmarks || []),
      ...(user.declined || []),
    ].map((id) => new mongoose.Types.ObjectId(id));

    // Фильтруем вакансии, исключая те, которые уже в списке
    jobs = jobs.filter(
      (job) => !excludeIds.some((excludeId) => excludeId.equals(job._id))
    );

    if (jobs.length > 0) {
      ctx.session.jobs = jobs;
      ctx.session.currentJobIndex = 0;
      displayJob(ctx, user);
    } else {
      ctx.reply(
        "К сожалению в вашем воеводстве нету новых вакансий на данный момент."
      );
    }
  }
});

bot.command("bookmarks", async (ctx) => {
  if (!ctx.session) ctx.session = {};
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user && user.bookmarks.length > 0) {
    const bookmarks = await Job.find({ _id: { $in: user.bookmarks } }); // Находим все закладки
    ctx.session.jobs = bookmarks; // Сохраняем в сессии
    ctx.session.currentJobIndex = 0;
    displayBookmark(ctx, user);
  } else {
    ctx.reply("У вас нет закладок.");
  }
});

function displayBookmark(ctx, user) {
  if (!ctx.session) ctx.session = {};
  if (ctx.session.currentJobIndex < ctx.session.jobs.length) {
    const job = ctx.session.jobs[ctx.session.currentJobIndex];
    const t = locales[user.language];
    let jobText = `*${job.name}*\n\n${job.description}\n\nЗарплата: ${
      job.salary
    }\nГород: ${job.city}\nВоеводство: ${
      job.voivodeship
    }\nОбязанности: ${job.responsibilities.join(
      ", "
    )}\nБонусы: ${job.bonuses.join(", ")}`;
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
    ctx.reply("Больше закладок нет.");
  }
}

function displayJob(ctx, user) {
  if (!ctx.session) ctx.session = {}; // Подстраховка, если сессия не была инициализирована
  if (ctx.session.currentJobIndex < ctx.session.jobs.length) {
    const job = ctx.session.jobs[ctx.session.currentJobIndex];
    const t = locales[user.language];
    let jobText = `*${job.name}*\n\n${job.description}\n\nЗарплата: ${
      job.salary
    }\nГород: ${job.city}\nВоеводство: ${
      job.voivodeship
    }\nОбязанности: ${job.responsibilities.join(
      ", "
    )}\nБонусы: ${job.bonuses.join(", ")}`;
    ctx.reply(jobText, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: t.apply, callback_data: `apply-${job._id}` }],
          [{ text: t.bookmark, callback_data: `bookmark-${job._id}` }],
          [{ text: t.notInterested, callback_data: `decline-${job._id}` }],
        ],
      },
    });
  } else {
    ctx.reply("Больше вакансий нет.");
  }
}

bot.action(/^apply-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1];
  if (user && !user.interested.includes(jobId)) {
    // Проверка на наличие ID
    user.interested.push(jobId);
    await user.save();

    const t = locales[user.language];
    const job = await Job.findById(jobId);
    if (job) {
      // Отправка email
      try {
        await sendMail(
          `Отклик на вакансию: ${job.name}`,
          `Пользователь ${user.fullName} заинтересован в вакансии ${job.name}.`
        );
        ctx.reply(t.appliedSuccess);
      } catch (error) {
        console.error("Ошибка при отправке письма:", error);
        ctx.reply("Ошибка при отправке отклика. Попробуйте снова.");
      }
    } else {
      ctx.reply("Вакансия не найдена.");
    }

    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply("Вы уже откликнулись на эту вакансию.");
  }
});

bot.action(/^bookmarkApply-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1]; // Это строка с ID
  if (user) {
    const jobObjectId = new mongoose.Types.ObjectId(jobId); // Преобразуем в ObjectId
    if (
      user.bookmarks.some((id) => id.equals(jobObjectId)) &&
      !user.interested.some((id) => id.equals(jobObjectId))
    ) {
      user.interested.push(jobObjectId); // Добавляем в interested как ObjectId
      user.bookmarks = user.bookmarks.filter((id) => !id.equals(jobObjectId)); // Удаляем из bookmarks
      await user.save();

      // Обновляем сессию
      ctx.session.jobs = await Job.find({ _id: { $in: user.bookmarks } });
      ctx.session.currentJobIndex = 0;

      const t = locales[user.language];
      const job = await Job.findById(jobObjectId);
      if (job) {
        try {
          await sendMail(
            `Отклик на вакансию: ${job.name}`,
            `Пользователь ${user.fullName} заинтересован в вакансии ${job.name}.`
          );
          ctx.reply(t.appliedSuccess);
        } catch (error) {
          console.error("Ошибка при отправке письма:", error);
          ctx.reply("Ошибка при отправке отклика. Попробуйте снова.");
        }
      } else {
        ctx.reply("Вакансия не найдена.");
      }
    } else if (user.interested.some((id) => id.equals(jobObjectId))) {
      ctx.reply("Вы уже откликнулись на эту вакансию.");
    } else {
      ctx.reply("Вакансия не найдена в закладках.");
    }
    displayBookmark(ctx, user);
  }
});

bot.action(/^bookmark-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1];
  if (user && !user.bookmarks.includes(jobId)) {
    user.bookmarks.push(jobId);
    await user.save();
    const t = locales[user.language];
    ctx.reply(t.bookmarkedSuccess);
    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply("Эта вакансия уже в ваших закладках.");
  }
});

bot.action(/^decline-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1];
  if (user && !user.declined.includes(jobId)) {
    user.declined.push(jobId);
    await user.save();
    ctx.session.currentJobIndex++;
    displayJob(ctx, user);
  } else {
    ctx.reply("Вы уже отклонили эту вакансию.");
  }
});

bot.action(/^bookmarkDecline-(.*)$/, async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  const jobId = ctx.match[1]; // Это строка с ID
  if (user) {
    const jobObjectId = new mongoose.Types.ObjectId(jobId); // Преобразуем в ObjectId
    if (
      user.bookmarks.some((id) => id.equals(jobObjectId)) &&
      !user.declined.some((id) => id.equals(jobObjectId))
    ) {
      user.declined.push(jobObjectId); // Добавляем в declined как ObjectId
      user.bookmarks = user.bookmarks.filter((id) => !id.equals(jobObjectId)); // Удаляем из bookmarks
      await user.save();

      // Обновляем сессию
      ctx.session.jobs = await Job.find({ _id: { $in: user.bookmarks } });
      ctx.session.currentJobIndex = 0;

      displayBookmark(ctx, user);
    } else if (user.declined.some((id) => id.equals(jobObjectId))) {
      ctx.reply("Вы уже отклонили эту вакансию.");
    } else {
      ctx.reply("Вакансия не найдена в закладках.");
    }
  }
});

bot.action("confirmDelete", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    try {
      await User.deleteOne({ telegramId: ctx.from.id });
      const t = locales[user.language];
      ctx.reply(t.profileDeleted);
      ctx.session = {}; // Сбрасываем сессию
    } catch (error) {
      console.error("Ошибка при удалении профиля:", error);
      ctx.reply("Произошла ошибка при удалении профиля. Попробуйте снова.");
    }
  } else {
    ctx.reply("Пользователь не найден.");
  }
});

bot.action("cancelDelete", async (ctx) => {
  const user = await User.findOne({ telegramId: ctx.from.id });
  if (user) {
    const t = locales[user.language];
    ctx.reply(t.deleteCanceled);
    await displayProfile(ctx, user);
  } else {
    ctx.reply("Пользователь не найден.");
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
      ctx.reply(
        "Этот раздел не должен срабатывать, так как мы переходим к нему через action."
      );
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
      ctx.reply(
        "Этот раздел не должен срабатывать, так как мы переходим к нему через action."
      );
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
      // Редактирование
      if (ctx.session.editField) {
        let isValid = true; // По умолчанию считаем ввод корректным
        switch (ctx.session.editField) {
          case "fullName":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text);
            break;
          case "age":
            isValid = /^\d+$/.test(ctx.message.text);
            if (isValid) ctx.message.text = parseInt(ctx.message.text); // Преобразование в число
            break;
          case "city":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s]+$/.test(ctx.message.text);
            break;
          case "professions":
            isValid = /^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s,]+$/.test(ctx.message.text);
            break;
          case "expectedSalary":
            isValid = /^\d+$/.test(ctx.message.text);
            if (isValid) ctx.message.text = parseInt(ctx.message.text); // Преобразование в число
            break;
          // Для email и phone валидация не требуется, так как они string
        }

        if (isValid) {
          const fieldToSave =
            ctx.session.editField === "expectedSalary"
              ? "expectedSalary"
              : ctx.session.editField;
          const saved = await saveUserData(user, fieldToSave, ctx.message.text);
          if (saved) {
            ctx.reply(`Поле ${ctx.session.editField} обновлено.`);
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
        // Если фото еще не было загружено (заполнение профиля)
        const saved = await saveUserData(user, "photo", photoUrl);
        if (saved) {
          await displayProfile(ctx, user);
        }
      } else if (ctx.session.editField === "photo") {
        // Редактирование фото
        const saved = await saveUserData(user, "photo", photoUrl);
        if (saved) {
          ctx.session.editField = null;
          await displayProfile(ctx, user);
        }
      } else {
        ctx.reply("Фото уже загружено. Для изменения используйте /edit.");
      }
    } else {
      ctx.reply(t.photoQuestion);
    }
  }
});

// Обработчики для редактирования
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
        `Язык изменен на ${newLanguage === "pl" ? "польский" : "украинский"}.`
      );
      await displayProfile(ctx, user); // Отображаем обновленный профиль
    } else {
      ctx.reply("Ошибка при изменении языка. Попробуйте снова.");
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
    ctx.reply(t.genderQuestion, {
      reply_markup: {
        inline_keyboard: [
          [{ text: t.male, callback_data: "male" }],
          [{ text: t.female, callback_data: "female" }],
        ],
      },
    });
    ctx.session.editField = "gender";
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
    if (user && ctx.session.editField === "voivodeship") {
      const [, newVoivodeship] = ctx.match[0].split("-");
      const saved = await saveUserData(user, "voivodeship", newVoivodeship);
      if (saved) {
        const t = locales[user.language];
        ctx.reply(`Воеводство обновлено на ${newVoivodeship}.`);
        ctx.session.editField = null;
        await displayProfile(ctx, user);
      } else {
        ctx.reply("Ошибка при обновлении воеводства. Попробуйте снова.");
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
