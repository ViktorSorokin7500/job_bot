const locales = {
  ua: {
    start: "Ви почали нову анкету. Давайте знову почнемо.",
    chooseLanguage: "Оберіть мову:",
    languageOptions: {
      ua: "Вам зручніше спілкуватись українською",
      pl: "Вам зручніше спілкуватись польською",
    },
    nameAndSurnameQuestion:
      'Напишіть своє ім’я та прізвище (латинськими літерами, наприклад: "Taras Morozec"):',
    genderQuestion:
      "Оберіть свою стать — натисніть на один із запропонованих варіантів",

    male: "Чоловік",
    female: "Жінка",

    ageQuestion: 'Вкажіть ваш вік цифрами (наприклад: "37").',
    voivodeshipQuestion:
      "Оберіть воєводство, в якому ви перебуваєте — натисніть на одне з запропонованих варіантів",
    cityQuestion:
      'Вкажіть населений пункт, в якому ви знаходитесь (латинськими літерами, наприклад: "Krakow"):',
    professionsQuestion:
      "Вкажіть до п'яти професій, які вас цікавлять (латинськими літерами та через кому, наприклад: 'kierowca, malarz, menedżer, kucharz, tłumacz')",
    expectedSalaryQuestion:
      "Вкажіть, на яку ставку в злотих на місяць ви очікуєте:",
    phoneQuestion:
      'Вкажіть свій польский номер телефону: (без пробілів, без дефісів, лише 9 цифр, наприклад - "572653148")',
    emailQuestion:
      "Вкажіть свій email: (наприклад: user@gmail.com), якщо в вас його немає просто скопіюйте в поле вказане у прикладі",
    photoQuestion:
      "Додайте своє фото (завантажте будь-яке фото, інший формат відповіді не зарахує ваші відповіді).",
    formFilled:
      "Ваша інформація успішно збережена. Якщо у нас будуть підходящі вакансії, ми з вами зв'яжемося. Якщо хочете подати ще одну анкету - натисніть /start",
    thanks: "Дякуємо!",
    invalidInput:
      "Використовуйте тільки латинські літери (включаючи польські), цифри, пробіл або символи @ . _ , - +",
    formAlreadyFilled:
      "Ви вже заповнили анкету. Використайте /start, щоб почати нову.",
    photoError: "Сталася помилка під час обробки фото.",
    formNotStarted:
      "Ви ще не почали заповнювати анкету. Використайте команду /start.",
    profileViewed: "Вашу анкету показано",
    chooseEdit: "Оберіть, що ви хочете змінити:",
    editName: "Ім'я",
    editGender: "Стать",
    editAge: "Вік",
    editCity: "Місто",
    editVoivodeship: "Воєводство",
    editProfessions: "Професії",
    editSalary: "Очікувана зарплата",
    editPhone: "Телефон",
    editEmail: "Email",
    editPhoto: "Фото",
    fieldUpdated: "Поле {0} оновлено!",
    deleteConfirmation: "Ви впевнені, що хочете видалити свій профіль?",
    confirmDelete: "Підтвердити",
    cancel: "Скасувати",
    profileDeleted: "Ваш профіль був видалений.",
    deleteCancelled: "Видалення скасовано.",
    errorDeletingProfile: "Виникла помилка при видаленні профілю.",
    viewVacancies: "Перейти до перегляду вакансій",
    noVacancies: "Вакансій у вашому регіоні не знайдено.",
    description: "Опис",
    salary: "Зарплата",
    city: "Місто",
    voivodeship: "Воєводство",
    responsibilities: "Обов'язки",
    bonuses: "Бонуси",
  },
  pl: {
    start: "Rozpocząłeś nowy formularz. Zacznijmy od nowa.",
    chooseLanguage: "Wybierz język:",
    languageOptions: {
      ua: "Wygodniej Ci rozmawiać po ukraińsku",
      pl: "Wygodniej Ci rozmawiać po polsku",
    },
    nameAndSurnameQuestion:
      'Wpisz swoje imię i nazwisko (literami łacińskimi, na przykład: "Taras Morozec"):',
    genderQuestion: "Wybierz swoją płeć — kliknij jedną z proponowanych opcji",

    male: "Mężczyzna",
    female: "Kobieta",

    ageQuestion: 'Podaj swój wiek cyframi (na przykład: "37").',
    voivodeshipQuestion:
      "Wybierz województwo, w którym się znajdujesz — kliknij jedną z proponowanych opcji",
    cityQuestion:
      'Podaj miejscowość, w której się znajdujesz (literami łacińskimi, na przykład: "Kraków"):',
    professionsQuestion:
      'Podaj do pięciu zawodów, którymi jesteś zainteresowany (literami łacińskimi i oddzielając je przecinkiem, na przykład: "kierowca, malarz, menedżer, kucharz, tłumacz"):',
    expectedSalaryQuestion:
      "Podaj, jaką stawkę w złotych na miesiąc oczekujesz:",
    phoneQuestion:
      'Podaj swój polski numer telefonu: (bez spacji, bez myślników, tylko 9 cyfr, na przykład - "572653148")',
    emailQuestion:
      "Wpisz swój adres e-mail: (na przykład: user@gmail.com). Jeśli go nie macie, po prostu skopiujcie adres podany w przykładzie.",
    photoQuestion:
      "Dodaj swoje zdjęcie (prześlij dowolne zdjęcie, inny format nie zostanie zaakceptowany).",
    formFilled:
      "Twoje informacje zostały pomyślnie zapisane. Jeśli będziemy mieli odpowiednie oferty pracy, skontaktujemy się z Tobą. Jeśli chcesz złożyć jeszcze jedną ankietę, naciśnij /start",
    thanks: "Dziękujemy!",
    invalidInput:
      "Używaj tylko liter łacińskich (w tym polskich), cyfr, spacji lub symboli @ . , - +",
    formAlreadyFilled:
      "Już wypełniłeś formularz. Użyj /start, aby rozpocząć nowy.",
    photoError: "Wystąpił błąd podczas przetwarzania zdjęcia.",
    formNotStarted:
      "Nie rozpocząłeś jeszcze wypełniania formularza. Użyj komendy /start.",
    profileViewed: "Twój profil został wyświetlony",
    chooseEdit: "Wybierz, co chcesz zmienić:",
    editName: "Imię",
    editGender: "Płeć",
    editAge: "Wiek",
    editCity: "Miasto",
    editVoivodeship: "Województwo",
    editProfessions: "Zawody",
    editSalary: "Oczekiwana pensja",
    editPhone: "Telefon",
    editEmail: "Email",
    editPhoto: "Zdjęcie",
    fieldUpdated: "Pole {0} zostało zaktualizowane!",
    deleteConfirmation: "Czy na pewno chcesz usunąć swój profil?",
    confirmDelete: "Potwierdź",
    cancel: "Anuluj",
    profileDeleted: "Twój profil został usunięty.",
    deleteCancelled: "Usuwanie anulowane.",
    errorDeletingProfile: "Wystąpił błąd podczas usuwania profilu.",
    viewVacancies: "Przejdź do przeglądania ofert pracy",
    noVacancies: "Nie znaleziono ofert pracy w twoim regionie.",
    description: "Opis",
    salary: "Zarobki",
    city: "Miasto",
    voivodeship: "Województwo",
    responsibilities: "Obowiązki",
    bonuses: "Bonusy",
  },
};

module.exports = locales;
