const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

const demoUser =
  tg?.initDataUnsafe?.user || {
    id: "demo",
    first_name: "زائر",
    username: "demo"
  };

const app = document.getElementById("app");

let state = {
  tab: "home",
  projects: []
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));

async function api(url, options = {}) {

  const opts = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  };

  if (options.body && typeof options.body !== "string") {
    opts.body = JSON.stringify({
      ...options.body,
      telegramUser: demoUser
    });
  }

  const response = await fetch(url, opts);

  return response.json();
}

async function loadProjects() {

  try {

    const result = await api(
      "/api/projects?telegram_id=" +
      encodeURIComponent(demoUser.id)
    );

    state.projects = result.projects || [];

  } catch (error) {

    console.error(error);
    state.projects = [];

  }
}

function render() {

  app.innerHTML = `

<header class="top">

  <div>

    <div class="logo">
      مُدبّر <b>✦</b>
    </div>

    <small>
      أنت تحدد الهدف، ونحن ندبّر الباقي.
    </small>

  </div>

  <button class="pro" id="pro">
    👑 PRO
  </button>

</header>


<main>

${

state.tab === "home"
? home()

: state.tab === "projects"
? projects()

: search()

}

</main>


<nav>

<button
class="${state.tab === "home" ? "on" : ""}"
data-tab="home">

⌂

<small>
الرئيسية
</small>

</button>


<button
class="${state.tab === "search" ? "on" : ""}"
data-tab="search">

⌕

<small>
بحث
</small>

</button>


<button
class="${state.tab === "projects" ? "on" : ""}"
data-tab="projects">

▣

<small>
مشاريعي
</small>

</button>


<button data-pro>

♛

<small>
PRO
</small>

</button>

</nav>

`;

  document
    .querySelectorAll("[data-tab]")
    .forEach((button) => {

      button.onclick = () => {

        state.tab = button.dataset.tab;

        render();

      };

    });

  document
    .querySelectorAll("[data-pro]")
    .forEach((button) => {

      button.onclick = showPro;

    });

  document.getElementById("pro").onclick = showPro;

  document
    .getElementById("newProject")
    ?.addEventListener("click", newProject);

  document
    .getElementById("searchBtn")
    ?.addEventListener("click", () => {

      state.tab = "projects";

      render();

    });

}


function home() {

  return `

<section class="hero">

  <div class="pill">
    محرك إنجاز ذكي
  </div>


  <h1>

    ماذا تريد

    <br>

    <span>
      أن تنجز اليوم؟
    </span>

  </h1>


  <p>

    اكتب هدفك بطريقتك.
    مُدبّر يحوله إلى مشروع واضح،
    خطوات، ونتيجة قابلة للاستخدام.

  </p>


  <div class="box">

    <textarea
      id="goal"
      placeholder="مثال: أريد إطلاق متجر عطور على تيليجرام..."
    ></textarea>


    <button id="newProject">

      🚀 ابدأ المهمة

    </button>

  </div>


  <div class="trust">

    🔒 لن ننفذ إجراءً حساسًا بدون موافقتك

  </div>

</section>


<section class="cards">

${

[
  ["🔎", "بحث عميق", "حلّل سوقًا أو موضوعًا مع مصادر."],
  ["🚀", "ابدأ مشروعًا", "حوّل فكرة إلى خطة ومهام."],
  ["⚡", "مهمة سريعة", "أنجز مهمة محددة بسرعة."],
  ["🧠", "حلّل لي", "استخرج المهم من نص أو ملف."]
]

.map(
  (x) => `

<div class="card">

  <i>${x[0]}</i>

  <h3>
    ${x[1]}
  </h3>

  <p>
    ${x[2]}
  </p>

</div>

`
)
.join("")

}

</section>

`;

}


function projects() {

  return `

<section class="page">

<div class="head">

  <h2>
    📁 مشاريعي
  </h2>

  <button
    onclick="state.tab='home';render()"
  >
    + جديد
  </button>

</div>


${

state.projects.length

?

state.projects
.map(
  (p) => `

<article class="project">

  <small>
    مشروع
  </small>

  <h3>
    ${esc(p.title)}
  </h3>

  <p>
    ${esc(p.goal)}
  </p>

  <div class="bar">

    <i
      style="width:${p.progress}%"
    ></i>

  </div>

  <small>
    التقدم ${p.progress}%
  </small>

</article>

`
)
.join("")

:

`

<div class="empty">

  لا توجد مشاريع بعد.

  <br>

  <button
    onclick="state.tab='home';render()"
  >
    ابدأ أول مشروع
  </button>

</div>

`

}

</section>

`;

}


function search() {

  return `

<section class="page">

<div class="search">

  <div class="big">
    🔎
  </div>

  <h2>
    بحث عميق
  </h2>

  <p>

    اكتب ما تريد البحث عنه.
    لاحقًا سيقوم مُدبّر بجمع المصادر
    وتحليلها وإخراج تقرير مرتب.

  </p>


  <textarea
    placeholder="ما الذي تريد أن نبحث عنه؟"
  ></textarea>


  <button id="searchBtn">

    ابدأ البحث — 25 ⭐

  </button>

</div>

</section>

`;

}


async function newProject() {

  const goal =
    document
      .getElementById("goal")
      .value
      .trim();

  if (!goal) {

    alert("اكتب هدف المشروع أولًا");

    return;

  }


  const result = await api(
    "/api/projects",
    {
      method: "POST",
      body: {
        title: goal.slice(0, 55),
        goal
      }
    }
  );


  if (!result.ok) {

    alert(
      result.error || "حدث خطأ"
    );

    return;

  }


  await loadProjects();

  state.tab = "projects";

  render();

}


function showPro() {

  const modal =
    document.createElement("div");

  modal.className = "modal";


  modal.innerHTML = `

<div class="modalbox">

  <div class="crown">
    👑
  </div>

  <h2>
    مُدبّر PRO
  </h2>

  <p>

    ذاكرة أطول،
    مشاريع أكثر،
    بحث أعمق،
    وأولوية في التنفيذ.

  </p>


  <div class="features">

    <span>✓ مشاريع متعددة</span>

    <span>✓ ذاكرة المشاريع</span>

    <span>✓ بحث أعمق</span>

    <span>✓ مهام متكررة</span>

    <span>✓ ملفات أكبر</span>

    <span>✓ أولوية</span>

  </div>


  <button class="pay">

    199 ⭐ / شهر

  </button>


  <button class="close">

    إغلاق

  </button>


  <small>

    الدفع الحقيقي سيُربط
    عبر Telegram Stars
    في مرحلة الإنتاج.

  </small>

</div>

`;


  document.body.appendChild(modal);


  modal
    .querySelector(".close")
    .onclick = () => modal.remove();

}


loadProjects()
  .then(render);
