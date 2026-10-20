import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft, ArrowUpRight, Bell, ChevronDown, CircleHelp, CreditCard,
  LayoutDashboard, LogOut, Plus, Search, Settings2, Sparkles, Trash2, Wallet,
  X, Menu, TrendingUp, CalendarDays, ReceiptText
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api.js";

const money = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 2
}).format(Number(value || 0));
const today = () => new Date().toISOString().slice(0, 10);
const categoryIcons = { Food: "🥗", Transport: "🚌", Shopping: "🛍️", Bills: "⚡", Salary: "💼", Freelance: "✨", Health: "💊", Other: "📦" };

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("expenseflow_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("expenseflow_user")); } catch { return null; }
  });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, balance: 0, transactionCount: 0, byCategory: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", type: "expense", category: "Food", date: today(), note: "" });

  async function refresh() {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const [tx, sums] = await Promise.all([
        api("/transactions", { token }),
        api("/summary", { token })
      ]);
      setTransactions(tx); setSummary(sums);
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("session") || err.message.toLowerCase().includes("sign in")) logout();
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, [token]);

  function logout() {
    localStorage.removeItem("expenseflow_token");
    localStorage.removeItem("expenseflow_user");
    setToken(null); setUser(null); setTransactions([]);
  }

  async function submitAuth(event) {
    event.preventDefault(); setError("");
    try {
      const data = await api(`/auth/${authMode === "register" ? "register" : "login"}`, {
        method: "POST", body: JSON.stringify(authForm)
      });
      localStorage.setItem("expenseflow_token", data.token);
      localStorage.setItem("expenseflow_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setNotice("Welcome to ExpenseFlow.");
    } catch (err) { setError(err.message); }
  }

  function openCreate() {
    setEditing(null);
    setForm({ title: "", amount: "", type: "expense", category: "Food", date: today(), note: "" });
    setModalOpen(true); setError("");
  }

  function openEdit(tx) {
    setEditing(tx);
    setForm({ title: tx.title, amount: String(tx.amount), type: tx.type, category: tx.category, date: tx.date.slice(0, 10), note: tx.note || "" });
    setModalOpen(true); setError("");
  }

  async function saveTransaction(event) {
    event.preventDefault(); setError("");
    const body = { ...form, amount: Number(form.amount), note: form.note || null };
    try {
      await api(editing ? `/transactions/${editing.id}` : "/transactions", {
        token, method: editing ? "PATCH" : "POST", body: JSON.stringify(body)
      });
      setModalOpen(false); setNotice(editing ? "Transaction updated." : "Transaction added.");
      await refresh();
    } catch (err) { setError(err.message); }
  }

  async function deleteTransaction(tx) {
    if (!window.confirm(`Delete "${tx.title}"? This cannot be undone.`)) return;
    try {
      await api(`/transactions/${tx.id}`, { token, method: "DELETE" });
      setNotice("Transaction deleted."); await refresh();
    } catch (err) { setError(err.message); }
  }

  const filtered = useMemo(() => transactions.filter(tx => {
    const matchesType = filter === "all" || tx.type === filter;
    const text = `${tx.title} ${tx.category} ${tx.note || ""}`.toLowerCase();
    return matchesType && text.includes(query.toLowerCase());
  }), [transactions, filter, query]);

  const chartData = useMemo(() => {
    const map = new Map();
    transactions.forEach(tx => {
      const key = new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
      const entry = map.get(key) || { day: key, income: 0, expenses: 0, timestamp: new Date(tx.date).getTime() };
      entry[tx.type === "income" ? "income" : "expenses"] += tx.amount;
      map.set(key, entry);
    });
    return [...map.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-7);
  }, [transactions]);

  if (!token) {
    return <AuthScreen mode={authMode} setMode={setAuthMode} form={authForm} setForm={setAuthForm} onSubmit={submitAuth} error={error} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Wallet size={20}/></span><span>expense<span className="brand-light">flow</span></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item active"><LayoutDashboard size={18}/> Overview</button>
        <button className="nav-item" onClick={() => document.getElementById("transactions")?.scrollIntoView({ behavior: "smooth" })}><ReceiptText size={18}/> Transactions</button>
        <button className="nav-item" onClick={() => setNotice("Category reports are summarized in the right panel.")}><TrendingUp size={18}/> Reports</button>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><CircleHelp size={17}/></span><div><strong>Need a hand?</strong><small>Keep your money in focus.</small></div></div>
          <div className="profile-row"><div className="avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div><div className="profile-copy"><strong>{user?.name || "Your account"}</strong><small>{user?.email}</small></div><button className="icon-button" aria-label="Sign out" onClick={logout}><LogOut size={17}/></button></div>
        </div>
      </aside>

      {mobileNav && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={20}/></button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div>
          <div className="top-actions"><span className="date-pill"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span><button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice("You're all caught up.")}><Bell size={18}/></button><div className="top-avatar">{(user?.name || "U").slice(0,1).toUpperCase()}</div></div>
        </header>

        <div className="page-content">
          <section className="welcome-row"><div><div className="eyebrow"></div><h1>Good day, {user?.name?.split(" ")[0] || "there"} <span className="wave"></span></h1><p>Here's what's happening with your finances.</p></div><button className="primary-button" onClick={openCreate}><Plus size={18}/> Add transaction</button></section>

          {error && <div className="alert error-alert">{error}<button onClick={() => setError("")}><X size={16}/></button></div>}
          {notice && <div className="alert notice-alert">{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}

          <section className="stats-grid">
            <StatCard label="Total balance" value={money(summary.balance)} icon={<Wallet size={19}/>} tone="green" foot="Income minus expenses" />
            <StatCard label="Total income" value={money(summary.income)} icon={<ArrowDownLeft size={20}/>} tone="mint" foot="All recorded income" />
            <StatCard label="Total expenses" value={money(summary.expenses)} icon={<ArrowUpRight size={20}/>} tone="peach" foot="All recorded spending" />
            <StatCard label="Transactions" value={summary.transactionCount.toLocaleString("en-IN")} icon={<CreditCard size={19}/>} tone="lavender" foot="Across your account" />
          </section>

          <section className="content-grid">
            <div className="panel chart-panel">
              <div className="panel-heading"><div><h2>Cash flow</h2><p>Your recent transaction activity</p></div><span className="mini-tag">Last 7 dates</span></div>
              {chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#15966a" stopOpacity={0.2}/><stop offset="95%" stopColor="#15966a" stopOpacity={0}/></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ed9c79" stopOpacity={0.22}/><stop offset="95%" stopColor="#ed9c79" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9ede7"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#879187", fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: "#879187", fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}/><Tooltip formatter={v => money(v)} contentStyle={{ borderRadius: 12, border: "1px solid #e6ebe4", fontSize: 12 }}/><Area type="monotone" dataKey="income" name="Income" stroke="#15966a" strokeWidth={2.5} fill="url(#incomeFill)"/><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e99a76" strokeWidth={2.5} fill="url(#expenseFill)"/></AreaChart></ResponsiveContainer></div> : <EmptyChart onAdd={openCreate}/>}
              <div className="chart-legend"><span><i className="dot income-dot"/> Income</span><span><i className="dot expense-dot"/> Expenses</span></div>
            </div>
            <div className="panel category-panel">
              <div className="panel-heading"><div><h2>Spending by category</h2><p>Where your money goes</p></div><button className="icon-button" aria-label="Category settings" onClick={() => setNotice("Categories are assigned when you add a transaction.")}><Settings2 size={17}/></button></div>
              {summary.byCategory.length ? <div className="category-list">{summary.byCategory.slice(0, 5).map((item, i) => {
                const total = summary.expenses || 1;
                const pct = Math.round(item.amount / total * 100);
                return <div className="category-item" key={item.category}><div className="category-top"><span className="category-name"><span className={`category-emoji cat-${i % 5}`}>{categoryIcons[item.category] || "📦"}</span>{item.category}</span><strong>{money(item.amount)}</strong></div><div className="progress-track"><div className={`progress-fill fill-${i % 5}`} style={{ width: `${pct}%` }}/></div><small>{pct}% of expenses</small></div>;
              })}</div> : <div className="empty-category"><span className="empty-icon">◌</span><strong>No spending categories yet</strong><p>Add an expense to see your breakdown.</p><button className="text-button" onClick={openCreate}>Add your first expense <span>↗</span></button></div>}
            </div>
          </section>

          <section className="panel transactions-panel" id="transactions">
            <div className="transactions-heading"><div><h2>Recent transactions</h2><p>Your latest financial activity</p></div><button className="secondary-button" onClick={openCreate}><Plus size={16}/> New transaction</button></div>
            <div className="table-tools"><div className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search transactions..." aria-label="Search transactions"/></div><div className="filter-pills">{[["all","All"],["income","Income"],["expense","Expenses"]].map(([value,label]) => <button key={value} className={filter === value ? "filter-pill selected" : "filter-pill"} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
            <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th aria-label="Actions"/></tr></thead><tbody>
              {filtered.map(tx => <tr key={tx.id}><td><div className="transaction-cell"><span className={`transaction-icon ${tx.type === "income" ? "transaction-income" : "transaction-expense"}`}>{categoryIcons[tx.category] || (tx.type === "income" ? "↙" : "↗")}</span><div><strong>{tx.title}</strong><small>{tx.note || (tx.type === "income" ? "Money received" : "Money spent")}</small></div></div></td><td><span className="category-badge">{tx.category}</span></td><td className="date-cell">{new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td><td className={tx.type === "income" ? "amount-income" : "amount-expense"}>{tx.type === "income" ? "+" : "−"}{money(tx.amount)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${tx.title}`} onClick={() => openEdit(tx)}><Settings2 size={15}/></button><button className="icon-button danger-hover" aria-label={`Delete ${tx.title}`} onClick={() => deleteTransaction(tx)}><Trash2 size={15}/></button></div></td></tr>)}
              {!filtered.length && <tr><td colSpan="5"><div className="empty-table"><span>✦</span><strong>{loading ? "Loading transactions..." : "Nothing to show just yet"}</strong><p>{query || filter !== "all" ? "Try changing your search or filter." : "Add your first transaction to bring your dashboard to life."}</p>{!query && filter === "all" && <button className="text-button" onClick={openCreate}>Add transaction ↗</button>}</div></td></tr>}
            </tbody></table></div>
            <div className="table-footer"><span>Showing <strong>{filtered.length}</strong> of {transactions.length} transactions</span><span className="secure-note"><span className="secure-dot"/> Your data is private to your account</span></div>
          </section>
          <footer className="footer"><span>© {new Date().getFullYear()} ExpenseFlow</span><span>Made for clearer money decisions <span className="footer-heart">♥</span></span></footer>
        </div>
      </main>

      {modalOpen && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setModalOpen(false)}><form className="transaction-modal" onSubmit={saveTransaction}><div className="modal-heading"><div><span className="modal-kicker">{editing ? "UPDATE RECORD" : "NEW RECORD"}</span><h2>{editing ? "Edit transaction" : "Add transaction"}</h2><p>Keep your financial picture up to date.</p></div><button type="button" className="icon-button" aria-label="Close modal" onClick={() => setModalOpen(false)}><X size={19}/></button></div>
        {error && <div className="alert error-alert">{error}</div>}
        <label>Transaction title<input required maxLength="100" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Grocery shopping"/></label>
        <div className="form-two"><label>Amount (INR)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00"/></label><label>Date<input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}/></label></div>
        <label>Type<div className="type-switch"><button type="button" className={form.type === "expense" ? "type-option active-expense" : "type-option"} onClick={() => setForm({ ...form, type: "expense" })}><ArrowUpRight size={16}/> Expense</button><button type="button" className={form.type === "income" ? "type-option active-income" : "type-option"} onClick={() => setForm({ ...form, type: "income" })}><ArrowDownLeft size={16}/> Income</button></div></label>
        <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{["Food","Transport","Shopping","Bills","Salary","Freelance","Health","Other"].map(c => <option key={c}>{c}</option>)}</select></label>
        <label>Note <span className="optional-label">OPTIONAL</span><textarea rows="2" maxLength="500" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Add a little detail..."/></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Plus size={17}/>{editing ? "Save changes" : "Add transaction"}</button></div>
      </form></div>}
    </div>
  );
}

function StatCard({ label, value, icon, tone, foot }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><strong className="stat-value">{value}</strong><div className="stat-foot"><span className="stat-foot-dot"/> {foot}</div></div>;
}
function EmptyChart({ onAdd }) {
  return <div className="empty-chart"><div className="empty-chart-art"><span/><span/><span/><span/><span/><span/><span/></div><strong>Your cash flow starts here</strong><p>Add income or expenses to build your chart.</p><button className="text-button" onClick={onAdd}>Add your first transaction ↗</button></div>;
}
function AuthScreen({ mode, setMode, form, setForm, onSubmit, error }) {
  return <div className="auth-page"><div className="auth-visual"><div className="brand auth-brand"><span className="brand-mark"><Wallet size={20}/></span><span>expense<span className="brand-light">flow</span></span></div><div className="auth-message"><span className="eyebrow"><Sparkles size={14}/> FINANCIAL CLARITY, SIMPLIFIED</span><h1>A little more clarity.<br/><em>A lot more control.</em></h1><p>A calmer way to understand your spending, celebrate progress, and make room for what matters.</p><div className="auth-preview"><div className="preview-top"><span>MONTHLY OVERVIEW</span><span className="preview-live">● LIVE VIEW</span></div><strong>₹42,850.00</strong><small>Illustrative balance preview</small><div className="preview-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="preview-bottom"><span>↑ Income</span><span>↗ Expenses</span></div></div></div><div className="auth-caption">Small steps today. Stronger habits tomorrow.</div></div><div className="auth-form-side"><div className="auth-form-wrap"><div className="auth-mobile-brand brand"><span className="brand-mark"><Wallet size={20}/></span><span>expense<span className="brand-light">flow</span></span></div><span className="form-overline">{mode === "register" ? "YOUR NEXT CHAPTER" : "WELCOME BACK"}</span><h2>{mode === "register" ? "Create your account" : "Good to see you again"}</h2><p className="auth-subtitle">{mode === "register" ? "Start building a clearer picture of your money." : "Sign in to pick up where you left off."}</p>{error && <div className="alert error-alert">{error}</div>}<form onSubmit={onSubmit} className="auth-form">{mode === "register" && <label>Full name<input required minLength="2" maxLength="60" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name"/></label>}<label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/></label><label>Password<input required type="password" minLength={mode === "register" ? 8 : 1} maxLength="72" autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={mode === "register" ? "At least 8 characters" : "Your password"}/></label><button className="primary-button auth-submit" type="submit">{mode === "register" ? "Create account" : "Sign in"} <span>↗</span></button></form><div className="auth-toggle">{mode === "register" ? "Already have an account?" : "New to ExpenseFlow?"} <button onClick={() => setMode(mode === "register" ? "login" : "register")}>{mode === "register" ? "Sign in" : "Create an account"}</button></div><div className="auth-privacy">Your financial data is scoped to your account.</div></div></div></div>;
}
