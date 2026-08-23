import express from "express";
import Database from "better-sqlite3";
import { Telegraf } from "telegraf";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({limit:"2mb"}));

const db = new Database("mudabbir.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
  telegram_id TEXT PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS projects(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  stars INTEGER DEFAULT 0,
  result TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const bot = process.env.BOT_TOKEN ? new Telegraf(process.env.BOT_TOKEN) : null;

function upsertUser(u){
  if(!u?.id) return;
  db.prepare(`
    INSERT INTO users(telegram_id,username,first_name)
    VALUES(?,?,?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username=excluded.username,
      first_name=excluded.first_name,
      last_seen=CURRENT_TIMESTAMP
  `).run(String(u.id), u.username || "", u.first_name || "");
}

function telegramUser(req){
  // MVP: the client may send the Telegram user object after Telegram WebApp init.
  // Production must validate initData server-side before trusting identity.
  const u = req.body?.telegramUser || req.query?.telegramUser;
  return u || {id:"demo",username:"demo",first_name:"زائر"};
}

app.get("/api/health",(req,res)=>res.json({ok:true,name:"Mudabbir",version:"1.0"}));

app.post("/api/session",(req,res)=>{
  const u = telegramUser(req);
  upsertUser(u);
  res.json({ok:true,user:u});
});

app.get("/api/projects",(req,res)=>{
  const id = String(req.query.telegram_id || "demo");
  const rows = db.prepare("SELECT * FROM projects WHERE telegram_id=? ORDER BY updated_at DESC").all(id);
  res.json({ok:true,projects:rows});
});

app.post("/api/projects",(req,res)=>{
  const u = telegramUser(req);
  upsertUser(u);
  const title = String(req.body.title || "مشروع جديد").trim();
  const goal = String(req.body.goal || "").trim();
  if(!goal) return res.status(400).json({ok:false,error:"اكتب هدف المشروع"});
  const info = db.prepare("INSERT INTO projects(telegram_id,title,goal,progress) VALUES(?,?,?,?)")
    .run(String(u.id),title,goal,5);
  const projectId = Number(info.lastInsertRowid);
  const defaultTasks = [
    ["فهم الهدف",0],
    ["بناء خطة التنفيذ",0],
    ["البحث والتحليل",25],
    ["إنتاج النتيجة",35],
    ["المراجعة والتسليم",50]
  ];
  const insert = db.prepare("INSERT INTO tasks(project_id,title,stars) VALUES(?,?,?)");
  for(const [name,stars] of defaultTasks) insert.run(projectId,name,stars);
  res.json({ok:true,id:projectId});
});

app.get("/api/projects/:id",(req,res)=>{
  const project = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if(!project) return res.status(404).json({ok:false});
  const tasks = db.prepare("SELECT * FROM tasks WHERE project_id=? ORDER BY id").all(req.params.id);
  res.json({ok:true,project,tasks});
});

app.post("/api/tasks/:id/approve",(req,res)=>{
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if(!task) return res.status(404).json({ok:false});
  db.prepare("UPDATE tasks SET status='approved' WHERE id=?").run(req.params.id);
  res.json({ok:true,message:"تمت الموافقة. مرحلة التنفيذ الفعلي ستُربط بمحرك الذكاء الاصطناعي في المرحلة التالية."});
});

app.post("/api/stars/invoice",(req,res)=>{
  // Placeholder for Telegram Stars. Never trust client-side prices.
  const amount = Number(req.body.amount || 0);
  if(!Number.isInteger(amount) || amount < 1) return res.status(400).json({ok:false,error:"invalid amount"});
  res.json({ok:true,mode:"pending",message:"واجهة Stars جاهزة للربط. يجب إنشاء invoice عبر Bot API باستخدام BOT_TOKEN في الخادم."});
});

app.use(express.static(path.join(__dirname,"public")));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

if(bot){
  bot.start(ctx => ctx.reply("أهلًا بك في مُدبّر ✦\nافتح التطبيق من زر القائمة لبدء مشروعك."));
  bot.command("help",ctx=>ctx.reply("مُدبّر يحول أهدافك إلى مشاريع ومهام قابلة للتنفيذ."));
  bot.launch().catch(console.error);
  process.once("SIGINT",()=>bot.stop("SIGINT"));
  process.once("SIGTERM",()=>bot.stop("SIGTERM"));
}

const port = Number(process.env.PORT || 3000);
app.listen(port,()=>console.log(`Mudabbir running on ${port}`));
