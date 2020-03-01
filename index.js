const config = [
  {
    // pediatra dzieci chore
    "enabled": true,
    "login": 123,
    "password": "",
    "specialists": [
      1590, // pediatra
      158, // med rodzinna
    ],
  },
  {
    // pediatra dzieci chore
    "enabled": false,
    "login": 987,
    "password": "",
    "specialists": [
      1590, // pediatra
    ],
    "doctors": [
    ],
  },
];

const onlyEnabled = config.filter((d) => d.enabled);
const {login, password, specialists, doctors = []} = onlyEnabled[Math.floor(Math.random() * Object.keys(onlyEnabled).length)];

const specialistId = process.env.SPECIALIST_ID || specialists[Math.floor(Math.random() * specialists.length)];
const doctorIds = [doctors[Math.floor(Math.random() * doctors.length)]].filter(Boolean);

const cityId = process.env.CITY_ID || '205';
const pushMeToken = process.env.PUSH_ME_TOKEN || '';

const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({devtools: false, headless: true});

  const page = await browser.newPage()
  await page.setViewport({width: 1440, height: 789});
  const navigationPromise = page.waitForNavigation();

  await page.goto('https://mol.medicover.pl/Users/Account/AccessDenied?ReturnUrl=%2F')
  await navigationPromise;

  // otwieramy logowanie
  await page.waitForSelector('.portlet-body #oidc-submit')
  await page.click('.portlet-body #oidc-submit')
  await new Promise(res => browser.on('targetcreated', res))

  const pages = await browser.pages(); // get all open pages by the browser
  const popup = pages[pages.length - 1];

  popup.waitFor(2000);
  await popup.waitForSelector('#username-email')

  // wpisujemy dane
  await popup.type('#username-email', login.toString());
  await popup.type('#password', password);
  popup.waitFor(2000);

  // wysylamy i czekamy na zamkniecie
  await popup.click('.btn.btn-block.btn-primary');
  await popup.waitForNavigation();
  popup.waitFor(1000);

  await navigationPromise;

  await page.goto('https://mol.medicover.pl/MyVisits');
  await navigationPromise;

  await page.evaluate((cityId, specialistId, pushMeToken, doctorIds) => fetch("/api/MyVisits/SearchFreeSlotsToBook?language=pl-PL", {
      body: JSON.stringify({
        clinicIds: [],
        doctorIds,
        doctorLanguagesIds: [],
        regionIds: [cityId],
        searchSince: new Date().toISOString(),
        serviceIds: [specialistId],
        serviceTypeId: 2,
      }),
      headers: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
      },
      method: "post",
  }).then((res) => res.json()).then(async (res) => {

  if (res.items.length) {
    const found = res.items.map((i) => `${i.specializationName} | ${i.doctorName} | ${i.appointmentDate}`);
    await fetch('https://pushmeapi.jagcesar.se?identifier=' + pushMeToken + '&title=' + encodeURIComponent(found.join('\n')), {method: 'GET',mode: 'no-cors'});
  }

  }), cityId, specialistId, pushMeToken, doctorIds);

  await browser.close();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});