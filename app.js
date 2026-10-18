(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.CHECKMATE_CONFIG || {};
  const hasSupabaseConfig = config.supabaseUrl && config.supabasePublishableKey &&
    !config.supabaseUrl.includes("YOUR_") && !config.supabasePublishableKey.includes("YOUR_");
  let supabaseClient = null;
  let authMode = "signup";
  let currentUser = null;
  let toastTimer = null;

  const events = [
    {date:"OCT 18",type:"CLUB TOURNAMENT",title:"Autumn Rapid Cup",desc:"A relaxed rapid tournament for club members. Bring your focus and enjoy the challenge.",meta:"Online · 15 + 10",spots:"Open registration"},
    {date:"OCT 24",type:"WORKSHOP",title:"Tactics Lab: Think Two Moves Ahead",desc:"Practice forks, pins, and simple combinations in a guided group session.",meta:"Club workshop · 45 min",spots:"All levels welcome"},
    {date:"NOV 02",type:"COMMUNITY EVENT",title:"Friendly Sunday Arena",desc:"Meet other players, try new openings, and enjoy a friendly round-robin.",meta:"Online · Casual",spots:"Open registration"},
    {date:"NOV 09",type:"BEGINNER SESSION",title:"Chess Foundations",desc:"Learn how the pieces move and build habits for a confident opening.",meta:"Workshop · 30 min",spots:"Beginners welcome"}
  ];
  const lessons = [
    {icon:"♞",tone:"green",level:"BEGINNER",title:"Opening principles",duration:"8 min",desc:"Develop your pieces, fight for the center, and get your king to safety.",body:"A strong opening is about useful habits, not memorizing every move. Try to control the center, develop knights and bishops, avoid moving the same piece repeatedly without a reason, and castle when it is safe. Before each move, ask: does this help development, safety, or central control?"},
    {icon:"♙",tone:"blue",level:"BEGINNER",title:"Piece movement",duration:"6 min",desc:"Understand how every piece travels across the board.",body:"Pawns move forward but capture diagonally. Rooks move along ranks and files. Bishops move diagonally. Queens combine rook and bishop movement. Knights move in an L shape and can jump over pieces. Kings move one square in any direction, as long as they do not move into check."},
    {icon:"♜",tone:"gold",level:"INTERMEDIATE",title:"Spotting tactics",duration:"12 min",desc:"Find forks, pins, skewers, and discovered attacks.",body:"Look for forcing moves first: checks, captures, and direct threats. A fork attacks two or more targets at once. A pin limits a piece because moving it would expose something more valuable. A skewer attacks a valuable piece that may move and reveal another target behind it. Scan the whole board before committing."},
    {icon:"♝",tone:"purple",level:"INTERMEDIATE",title:"King safety",duration:"9 min",desc:"Recognize danger and keep your king protected.",body:"King safety starts with development and a sensible pawn structure. Avoid opening lines toward your own king without a reason. Notice enemy pieces aiming at your king, and count attackers and defenders. When under attack, consider whether you can move the king, capture the attacker, block the line, or create a counter-threat."},
    {icon:"♛",tone:"gold",level:"ALL LEVELS",title:"Endgame essentials",duration:"10 min",desc:"Use your king actively and turn an advantage into progress.",body:"In many endgames, the king becomes an active piece. Bring it toward the center when it is safe, support passed pawns, and calculate pawn races carefully. Rooks often belong behind passed pawns. If you are ahead, simplify only when it keeps a winning position; do not trade automatically."},
    {icon:"✧",tone:"green",level:"ALL LEVELS",title:"Think in plans",duration:"7 min",desc:"Make a plan based on pawn structure and piece activity.",body:"A useful plan comes from the position. Ask which side of the board offers space, which pieces are active, what weaknesses can be targeted, and which pawn breaks may change the position. Reassess after every opponent move: their idea matters as much as yours."}
  ];
  const samplePlayers = [
    {name:"Maya Knight",level:"Tactics enthusiast",points:1840,tone:"gold",initial:"M"},
    {name:"Leo Bishop",level:"Endgame explorer",points:1725,tone:"blue",initial:"L"},
    {name:"Noor Rook",level:"Opening learner",points:1610,tone:"purple",initial:"N"},
    {name:"Adam Check",level:"Club regular",points:1495,tone:"green",initial:"A"},
    {name:"Sara Mate",level:"Puzzle solver",points:1380,tone:"gold",initial:"S"}
  ];

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  }
  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  }
  function navigate(view) {
    $$(".view").forEach(section => section.classList.toggle("active", section.id === `view-${view}`));
    $$(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
    const names = {home:"Overview",play:"Play chess",tournaments:"Tournaments",lessons:"Learn chess",leaderboard:"Leaderboard",community:"Community",profile:"Player profile"};
    $("#page-breadcrumb").textContent = names[view] || "Overview";
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function renderEvents(target, limit = events.length) {
    const container = $(target);
    if (!container) return;
    container.innerHTML = events.slice(0, limit).map((event, index) => `
      <article class="event-card">
        <div class="event-card-top"><span class="event-date">${event.date}</span><span class="event-type">${event.type}</span></div>
        <h3>${event.title}</h3><p>${event.desc}</p>
        <div class="event-card-bottom"><span>${event.meta}</span><button data-register="${index}">Details ↗</button></div>
      </article>`).join("");
  }
  function playerRow(player, rank) {
    return `<div class="leader-row"><span class="rank-num">${String(rank).padStart(2,"0")}</span><span class="avatar ${player.tone}">${safeText(player.initial)}</span><span><span class="leader-name">${safeText(player.name)}</span><span class="leader-sub">${safeText(player.level)}</span></span><span class="leader-points">${Number(player.points).toLocaleString()}</span></div>`;
  }
  function renderLeaderboard() {
    const localPlayer = currentUser ? [{
      name: currentUser.displayName || currentUser.email.split("@")[0],
      level: currentUser.level || "Club member", points: 0, tone:"green",
      initial: (currentUser.displayName || currentUser.email || "P").charAt(0).toUpperCase()
    }] : [];
    const players = [...localPlayer, ...samplePlayers].sort((a,b) => b.points - a.points);
    $("#mini-leaderboard").innerHTML = players.slice(0,3).map(playerRow).join("");
    $("#full-leaderboard").innerHTML = `<table class="leader-table"><thead><tr><th>RANK</th><th>PLAYER</th><th>LEVEL</th><th>POINTS</th></tr></thead><tbody>${players.map((player,i)=>`<tr><td>${String(i+1).padStart(2,"0")}</td><td><span class="table-player"><span class="avatar ${player.tone}">${safeText(player.initial)}</span>${safeText(player.name)}</span></td><td>${safeText(player.level)}</td><td>${Number(player.points).toLocaleString()}</td></tr>`).join("")}</tbody></table>`;
  }
  function renderLessons() {
    $("#lesson-catalog").innerHTML = lessons.map((lesson,index)=>`
      <button class="lesson-tile" data-lesson="${index}">
        <span class="lesson-symbol ${lesson.tone}">${lesson.icon}</span><h3>${lesson.title}</h3><p>${lesson.desc}</p><small>${lesson.level} · ${lesson.duration.toUpperCase()}</small>
      </button>`).join("");
  }
  function showLesson(index) {
    const lesson = lessons[Number(index)];
    if (!lesson) return;
    $$(".lesson-tile").forEach((tile,i)=>tile.classList.toggle("selected",i===Number(index)));
    $("#lesson-detail").innerHTML = `<div class="eyebrow">${lesson.level} · ${lesson.duration.toUpperCase()}</div><h2>${lesson.icon} &nbsp; ${lesson.title}</h2><p>${lesson.body}</p><button class="btn btn-primary" id="lesson-complete">Mark lesson complete ✓</button>`;
    $("#lesson-complete").addEventListener("click",()=>toast("Nice work! Lesson progress is saved in this demo session."));
    navigate("lessons");
  }
  function setProfile(profile) {
    currentUser = profile;
    const name = profile ? (profile.displayName || profile.email.split("@")[0]) : "Guest player";
    const initial = name.charAt(0).toUpperCase() || "G";
    $("#side-name").textContent = name;
    $("#side-avatar").textContent = initial;
    $("#community-name").textContent = name;
    $("#community-avatar").textContent = initial;
    $("#community-level").textContent = profile ? `${profile.level || "Beginner"} · Club member` : "Unranked · Visitor";
    $("#side-status").textContent = profile ? "Club member" : "Visitor account";
    $("#auth-button").textContent = profile ? "My profile" : "Sign in";
    $("#community-auth").textContent = profile ? "Edit my profile" : "Create account / Sign in";
    $("#stat-rank").textContent = profile ? "NEW" : "—";
    $("#profile-name").value = profile?.displayName || "";
    $("#profile-level").value = profile?.level || "Beginner";
    $("#profile-bio").value = profile?.bio || "";
    renderLeaderboard();
  }
  function openAuth(mode="signup") {
    authMode = mode;
    updateAuthMode();
    $("#auth-message").textContent = "";
    $("#auth-message").className = "form-message";
    $("#auth-modal").hidden = false;
    $("#auth-email").focus();
  }
  function closeAuth() { $("#auth-modal").hidden = true; }
  function updateAuthMode() {
    $$(".auth-tab").forEach(tab => tab.classList.toggle("active",tab.dataset.authMode===authMode));
    $("#auth-name").hidden = authMode === "signin";
    $("#auth-name-label").hidden = authMode === "signin";
    $("#auth-password").autocomplete = authMode === "signin" ? "current-password" : "new-password";
    $("#auth-title").textContent = authMode === "signin" ? "Welcome back." : "Your next move starts here.";
    $("#auth-subtitle").textContent = authMode === "signin" ? "Sign in to your Checkmate account." : "Create a profile to join the community.";
    $("#auth-submit").textContent = authMode === "signin" ? "Sign in" : "Create my account";
  }
  async function initSupabase() {
    if (!hasSupabaseConfig) return;
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = async () => {
      try {
        supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
        const {data:{session}} = await supabaseClient.auth.getSession();
        if (session?.user) await loadSupabaseProfile(session.user);
        supabaseClient.auth.onAuthStateChange(async (_event, sessionNow) => {
          if (sessionNow?.user) await loadSupabaseProfile(sessionNow.user);
          else setProfile(null);
        });
      } catch (error) { console.error(error); toast("Could not connect to Supabase. Check config.js."); }
    };
    script.onerror = () => toast("Could not load the Supabase client. Check your internet connection.");
    document.head.appendChild(script);
  }
  async function loadSupabaseProfile(user) {
    let profile = {id:user.id,email:user.email,displayName:user.user_metadata?.display_name || user.email?.split("@")[0],level:"Beginner",bio:""};
    try {
      const {data,error} = await supabaseClient.from("profiles").select("display_name, level, bio").eq("id",user.id).maybeSingle();
      if (!error && data) profile = {...profile,displayName:data.display_name || profile.displayName,level:data.level || "Beginner",bio:data.bio || ""};
    } catch (error) { console.warn("Profile table is not ready yet.",error); }
    setProfile(profile);
    closeAuth();
  }
  async function submitAuth(event) {
    event.preventDefault();
    const message = $("#auth-message");
    message.className = "form-message";
    message.textContent = "";
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const displayName = $("#auth-name").value.trim();
    if (!hasSupabaseConfig || !supabaseClient) {
      message.textContent = "Connect Supabase first: add your Project URL and publishable key to config.js, then refresh.";
      return;
    }
    $("#auth-submit").disabled = true;
    try {
      if (authMode === "signup") {
        const {data,error} = await supabaseClient.auth.signUp({email,password,options:{data:{display_name:displayName || email.split("@")[0]}}});
        if (error) throw error;
        if (data.session) {
          await loadSupabaseProfile(data.user);
          message.textContent = "Account created. Welcome to the club!";
          message.className = "form-message success";
        } else {
          message.textContent = "Check your email to confirm your account, then sign in.";
          message.className = "form-message success";
        }
      } else {
        const {data,error} = await supabaseClient.auth.signInWithPassword({email,password});
        if (error) throw error;
        await loadSupabaseProfile(data.user);
        message.textContent = "Signed in successfully.";
        message.className = "form-message success";
      }
    } catch (error) {
      message.textContent = error.message || "Authentication failed. Please try again.";
    } finally { $("#auth-submit").disabled = false; }
  }
  async function saveProfile(event) {
    event.preventDefault();
    if (!currentUser) { openAuth("signup"); toast("Create an account to save your profile."); return; }
    const updated = {...currentUser,displayName:$("#profile-name").value.trim(),level:$("#profile-level").value,bio:$("#profile-bio").value.trim()};
    if (supabaseClient && currentUser.id) {
      const {error} = await supabaseClient.from("profiles").upsert({id:currentUser.id,display_name:updated.displayName,level:updated.level,bio:updated.bio},{onConflict:"id"});
      if (error) { toast("Could not save profile: " + error.message); return; }
    } else {
      toast("This demo profile is only stored for this session. Connect Supabase to save it.");
    }
    setProfile(updated);
    navigate("community");
  }
  const pieceSymbols = {wk:"♔",wq:"♕",wr:"♖",wb:"♗",wn:"♘",wp:"♙",bk:"♚",bq:"♛",br:"♜",bb:"♝",bn:"♞",bp:"♟"};
  let boardFlipped = false;
  let chessGame = null;
  let robotMode = false;
  let selectedSquare = null;
  let legalTargets = [];
  function renderBoard() {
    const board = $("#practice-board");
    if (!board) return;
    if (!window.Chess) {
      board.innerHTML = '<p class="muted">The chess engine could not load. Please check your internet connection and refresh.</p>';
      return;
    }
    if (!chessGame) chessGame = new Chess();
    const grid = chessGame.board();
    const ranks = boardFlipped ? [...grid].reverse().map(row=>[...row].reverse()) : grid;
    board.innerHTML = ranks.map((row,r)=>row.map((piece,c)=>{
      const actualR = boardFlipped ? 7-r : r;
      const actualC = boardFlipped ? 7-c : c;
      const squareName = "abcdefgh"[actualC] + (8-actualR);
      const symbol = piece ? pieceSymbols[piece.color + piece.type] : "";
      const selected = selectedSquare === squareName ? " selected" : "";
      const target = legalTargets.includes(squareName) ? " legal-target" : "";
      return `<button type="button" class="square ${(r+c)%2===0?"light":"dark"}${selected}${target}" aria-label="${squareName}${piece?", "+piece.color+" "+piece.type:""}" data-square="${squareName}">${symbol}</button>`;
    }).join("")).join("");
    $$(".square",board).forEach(square=>square.addEventListener("click",()=>handleSquareClick(square.dataset.square)));
  }
  function handleSquareClick(square) {
    if (!chessGame || chessGame.game_over()) return;
    if (robotMode && chessGame.turn() !== "w") return;
    const piece = chessGame.get(square);
    if (selectedSquare && legalTargets.includes(square)) {
      const move = chessGame.move({from:selectedSquare,to:square,promotion:"q"});
      selectedSquare = null; legalTargets = [];
      renderBoard();
      if (move) {
        if (chessGame.game_over()) { updateGameStatus(); return; }
        if (robotMode && chessGame.turn() === "b") window.setTimeout(makeRobotMove,350);
        else updateGameStatus();
      }
      return;
    }
    if (piece && piece.color === "w") {
      selectedSquare = square;
      legalTargets = chessGame.moves({square,verbose:true}).map(move=>move.to);
    } else { selectedSquare = null; legalTargets = []; }
    renderBoard();
  }
  function updateGameStatus() {
    const status = $("#robot-status");
    if (!status) return;
    if (chessGame.in_checkmate()) status.textContent = chessGame.turn()==="w" ? "Checkmate — the robot wins this round." : "Checkmate — you win! Great play.";
    else if (chessGame.in_draw()) status.textContent = "Draw. Good practice — start another game when ready.";
    else if (chessGame.in_check()) status.textContent = chessGame.turn()==="w" ? "You're in check. Find a safe move." : "The robot is in check!";
    else status.textContent = robotMode ? (chessGame.turn()==="w" ? "Your move — you're playing White." : "Robot is thinking…") : "Practice board ready. Select a piece, then a destination square.";
  }
  function makeRobotMove() {
    if (!robotMode || !chessGame || chessGame.game_over()) return;
    const moves = chessGame.moves({verbose:true});
    if (!moves.length) return;
    const level = $("#robot-level").value;
    let choice;
    if (level === "beginner") {
      choice = moves[Math.floor(Math.random()*moves.length)];
    } else {
      const captures = moves.filter(m=>m.captured);
      const checks = moves.filter(m=>m.san.includes("+"));
      const pool = level === "advanced" ? [...captures,...captures,...checks,...moves] : [...captures,...checks,...moves];
      choice = pool[Math.floor(Math.random()*pool.length)];
    }
    chessGame.move({from:choice.from,to:choice.to,promotion:"q"});
    renderBoard(); updateGameStatus();
  }
  function startRobotGame() {
    robotMode = true; chessGame = new Chess(); selectedSquare = null; legalTargets = []; boardFlipped = false;
    $("#practice-panel").hidden = false;
    $("#robot-controls").hidden = false;
    $("#board-title").textContent = "Play against the robot";
    $("#board-help").textContent = "You play White. Click a piece, then a highlighted square. The robot replies after your move.";
    renderBoard(); updateGameStatus();
    $("#practice-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function startFreePractice() {
    robotMode = false; chessGame = new Chess(); selectedSquare = null; legalTargets = []; boardFlipped = false;
    $("#practice-panel").hidden = false;
    $("#robot-controls").hidden = true;
    $("#board-title").textContent = "Explore the board";
    $("#board-help").textContent = "This is a legal-move practice board. Select a piece and then a destination square; play both sides yourself.";
    renderBoard(); updateGameStatus();
    $("#practice-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) { event.preventDefault(); navigate(viewButton.dataset.view); }
    const lessonButton = event.target.closest("[data-lesson]");
    if (lessonButton) showLesson(lessonButton.dataset.lesson);
    const registerButton = event.target.closest("[data-register]");
    if (registerButton) toast(`${events[Number(registerButton.dataset.register)].title}: registration will be enabled when the club database is connected.`);
    const filter = event.target.closest(".filter-pill");
    if (filter) {
      $$(".filter-pill").forEach(p=>p.classList.remove("selected"));
      filter.classList.add("selected");
      const mode = filter.textContent.trim();
      const filtered = mode === "Tournaments" ? events.filter(e=>e.type.includes("TOURNAMENT")) : mode === "Workshops" ? events.filter(e=>e.type.includes("WORKSHOP") || e.type.includes("SESSION")) : events;
      $("#all-events").innerHTML = filtered.map(event=>{const i=events.indexOf(event);return `<article class="event-card"><div class="event-card-top"><span class="event-date">${event.date}</span><span class="event-type">${event.type}</span></div><h3>${event.title}</h3><p>${event.desc}</p><div class="event-card-bottom"><span>${event.meta}</span><button data-register="${i}">Details ↗</button></div></article>`}).join("");
    }
  });
  $("#auth-button").addEventListener("click",()=>currentUser?navigate("profile"):openAuth("signin"));
  $("#sidebar-profile").addEventListener("click",()=>currentUser?navigate("profile"):openAuth("signup"));
  $("#community-auth").addEventListener("click",()=>currentUser?navigate("profile"):openAuth("signup"));
  $("#close-auth").addEventListener("click",closeAuth);
  $("#auth-modal").addEventListener("click",event=>{if(event.target===$("#auth-modal"))closeAuth();});
  $$(".auth-tab").forEach(tab=>tab.addEventListener("click",()=>{authMode=tab.dataset.authMode;updateAuthMode();$("#auth-message").textContent="";}));
  $("#auth-form").addEventListener("submit",submitAuth);
  $("#profile-form").addEventListener("submit",saveProfile);
  $("#practice-button").addEventListener("click",startFreePractice);
  $("#robot-button").addEventListener("click",startRobotGame);
  $("#close-board").addEventListener("click",()=>$("#practice-panel").hidden=true);
  $("#flip-board").addEventListener("click",()=>{boardFlipped=!boardFlipped;renderBoard();});
  $("#reset-board").addEventListener("click",()=>{if(robotMode)startRobotGame();else startFreePractice();});
  $("#robot-level").addEventListener("change",()=>{if(robotMode)updateGameStatus();});
  $("#friend-button").addEventListener("click",()=>toast("Friend challenges will be available after multiplayer game hosting is configured."));
  $("#match-button").addEventListener("click",()=>toast("You're on the demo waitlist! No information was sent or saved."));
  $("#chat-form").addEventListener("submit",event=>{
    event.preventDefault();
    const input=$("#chat-input"); const text=input.value.trim(); if(!text)return;
    if(!currentUser){toast("Create an account before posting to the community.");openAuth("signup");return;}
    const item=document.createElement("div");item.className="chat-message";
    const avatar=document.createElement("span");avatar.className="avatar avatar-small";avatar.textContent=(currentUser.displayName||"P").charAt(0).toUpperCase();
    const p=document.createElement("p");const strong=document.createElement("strong");strong.textContent=currentUser.displayName||"Club member";p.append(strong,document.createElement("br"),document.createTextNode(text));item.append(avatar,p);$("#chat-messages").append(item);input.value="";
    toast("Demo message added in this browser only.");
  });
  $("#stat-events").textContent=String(events.length).padStart(2,"0");
  renderEvents("#home-events",3);
  renderEvents("#all-events");
  renderLessons();
  renderLeaderboard();
  setProfile(null);
  initSupabase();
})();