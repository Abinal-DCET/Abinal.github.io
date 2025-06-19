const DOM = {
    tournamentList: document.getElementById('tournamentList'),
    authButtons: document.getElementById('authButtons'),
    tournamentForm: document.getElementById('tournamentForm'),
    registerTeamForm: document.getElementById('registerTeamForm'),
    scoreEntryForm: document.getElementById('scoreEntryForm'),
    listTitle: document.getElementById('listTitle'),
    heroSection: document.getElementById('heroSection'),
    listControls: document.querySelector('.list-controls'),
    viewAllLink: document.getElementById('viewAllLink'),
    navMyTournaments: document.getElementById('navMyTournaments'),
    heroCreateBtn: document.getElementById('heroCreateBtn'),
};

let currentUser = localStorage.getItem('currentUser') || null;
let currentView = 'home';


const getStorage = (key, fallback = []) => JSON.parse(localStorage.getItem(key)) || fallback;
let tournaments = getStorage('tournaments');
let sessionUsers = getStorage('sessionUsers', {});


const saveTournaments = (newTournaments) => {
    tournaments = newTournaments;
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    renderTournaments();
};


const teamLogoHTML = (team) => team?.logo
    ? `<img src="${team.logo}" alt="${team.name} Logo" class="bracket-team-logo">`
    : `<div class="bracket-team-logo-placeholder"><i class="fas fa-user-secret"></i></div>`;

const getTournamentStatus = (t) => {
    const finalMatch = t.format === 'single-elimination'
        ? t.bracket?.rounds.at(-1)?.matches[0]
        : t.bracket?.grandFinal;
    return finalMatch?.winner ? 'completed' : 'ongoing';
};


function renderTournaments() {
    let source = (currentView === 'my' && currentUser)
        ? tournaments.filter(t => t.createdBy === currentUser)
        : tournaments;

    const filters = {
        search: document.getElementById('searchInput').value.toLowerCase(),
        format: document.getElementById('formatFilter').value,
        status: document.getElementById('statusFilter').value,
    };

    let filtered = (currentView === 'home') ? source.slice(0, 4) : source.filter(t =>
        t.name.toLowerCase().includes(filters.search) &&
        (filters.format === 'all' || t.format === filters.format) &&
        (filters.status === 'all' || getTournamentStatus(t) === filters.status)
    );

    if (filtered.length === 0) {
        DOM.tournamentList.innerHTML = "<p style='color:#bbb; text-align: left;'>No tournaments found.</p>";
        return;
    }

    DOM.tournamentList.innerHTML = filtered.map(t => {
        const originalIndex = tournaments.indexOf(t);
        return `
        <div class="tournament-card" onclick="showTournamentDetails(${originalIndex})">
            <div class="status-tag">${getTournamentStatus(t)}</div>
            <div class="tournament-title">${t.name}</div>
            <div class="meta">${t.format.replace('-', ' ')} | Teams: ${t.teams?.length || 0}/${t.maxTeams}</div>
            <p class="tournament-description">${t.description || 'No description.'}</p>
        </div>`;
    }).join('');
}

function showTournamentDetails(index) {
    const t = tournaments[index];
    if (!t) return;

    document.getElementById('tournamentDetailModal').dataset.currentIndex = index;

    Object.entries({
        'detailName': t.name,
        'detailFormat': t.format.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        'detailTeamSize': `${t.teamSize}v${t.teamSize}`,
        'detailRegDeadline': new Date(t.regDeadline).toLocaleString(),
        'detailStartDate': new Date(t.startDate).toLocaleString(),
        'detailCreator': t.createdBy || 'N/A',
        'detailDescription': t.description || 'No description provided.',
        'detailTeamsRegistered': `${t.teams?.length || 0} / ${t.maxTeams}`,
    }).forEach(([id, value]) => document.getElementById(id).textContent = value);

    const teamsList = document.getElementById('detailTeamsList');
    teamsList.innerHTML = t.teams?.length
        ? t.teams.map(team => `
            <div class="team-roster-card">
                <h4 class="team-roster-name">
                    ${team.logo ? `<img src="${team.logo}" alt="${team.teamName} Logo" class="team-list-logo">` : `<div class="team-list-logo-placeholder"><i class="fas fa-user-secret"></i></div>`}
                    ${team.teamName} <span class="captain-tag">(Captain: ${team.captainName})</span>
                </h4>
                <ul class="roster-list">${Object.entries(team.roster).map(([role, name]) => `<li><strong>${role.charAt(0).toUpperCase() + role.slice(1)}:</strong> ${name}</li>`).join('')}</ul>
            </div>`).join('')
        : '<p>No teams registered yet.</p>';
    
    const canRegister = currentUser && new Date() < new Date(t.regDeadline) && (t.teams?.length || 0) < t.maxTeams;
    document.getElementById('detailRegisterSection').style.display = canRegister ? 'block' : 'none';
    if (canRegister) DOM.registerTeamForm.dataset.tournamentIndex = index;

    renderBracketManagement(index);
    renderBracket(index);
    renderStandings(index);
    openModal('tournamentDetail');
}

function updateAuthUI() {
    if (currentUser) {
        DOM.authButtons.innerHTML = `<span>${currentUser}</span><button onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
        DOM.navMyTournaments.style.display = 'inline';
        if (DOM.heroCreateBtn) DOM.heroCreateBtn.style.display = 'inline-block';
    } else {
        DOM.authButtons.innerHTML = `<button onclick="openModal('login')">Login</button><button onclick="openModal('register')">Register</button>`;
        DOM.navMyTournaments.style.display = 'none';
        if (DOM.heroCreateBtn) DOM.heroCreateBtn.style.display = 'none';
    }
}


const openModal = (id) => document.getElementById(id + 'Modal').classList.add('show');
const closeModal = (id) => document.getElementById(id + 'Modal').classList.remove('show');
const switchModal = (from, to) => { closeModal(from); openModal(to); };

function register() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    if (!user || !pass || pass !== document.getElementById('regPass2').value) return alert("Invalid details. Check passwords match.");
    if (sessionUsers[user]) return alert("Username already exists.");
    sessionUsers[user] = { password: pass };
    localStorage.setItem('sessionUsers', JSON.stringify(sessionUsers));
    alert("Registered successfully!");
    switchModal('register', 'login');
}

function login() {
    const user = document.getElementById('loginUser').value.trim();
    if (sessionUsers[user]?.password !== document.getElementById('loginPass').value) return alert("Invalid username or password.");
    currentUser = user;
    localStorage.setItem('currentUser', currentUser);
    closeModal('login');
    updateAuthUI();
    renderTournaments();
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    document.getElementById('navHome').click();
}


DOM.tournamentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in.");
    const data = Object.fromEntries(new FormData(e.target));
    if (new Date(data.startDate) <= new Date(data.regDeadline)) return alert('Start Date must be after Registration Deadline.');
    if (data.format === 'double-elimination' && data.maxTeams < 4) return alert('Double Elimination requires at least 4 teams.');
    
    saveTournaments([...tournaments, { ...data, id: Date.now(), createdBy: currentUser, teams: [], bracket: null }]);
    closeModal('createTournament');
    e.target.reset();
});

DOM.registerTeamForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const index = parseInt(this.dataset.tournamentIndex);
    const t = tournaments[index];
    
    
    const newTeam = {
        id: `team_${Date.now()}`,
        teamName: document.getElementById('registerTeamName').value,
        logo: document.getElementById('registerTeamLogo').value,
        captainName: document.getElementById('registerCaptainName').value,
        roster: {
            top: document.getElementById('registerTop').value,
            jungle: document.getElementById('registerJungle').value,
            mid: document.getElementById('registerMid').value,
            bot: document.getElementById('registerBot').value,
            support: document.getElementById('registerSupport').value
        }
    };

    if (Object.values(newTeam.roster).some(p => !p) || !newTeam.teamName || !newTeam.captainName) return alert("Please fill all required fields.");
    
    t.teams.push(newTeam);
    saveTournaments([...tournaments]);
    alert("Team registered!");
    e.target.reset();
    closeModal('tournamentDetail');
    showTournamentDetails(index);
});

DOM.scoreEntryForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const { tIndex, bracketType, rIndex, mIndex } = this.dataset;
    const t = tournaments[tIndex];
    let match;
    if (bracketType === 'grandFinal') match = t.bracket.grandFinal;
    else if (bracketType === 'lower') match = t.bracket.lower[rIndex].matches[mIndex];
    else match = (t.format === 'single-elimination') ? t.bracket.rounds[rIndex].matches[mIndex] : t.bracket.upper[rIndex].matches[mIndex];

    const s1 = parseInt(document.getElementById('scoreTeam1').value), s2 = parseInt(document.getElementById('scoreTeam2').value);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return alert('Invalid scores.');
    
    match.score1 = s1; match.score2 = s2;
    match.winner = s1 > s2 ? match.team1.id : match.team2.id;
    match.loser = s1 < s2 ? match.team1.id : match.team2.id;
    
    handleMatchResult(parseInt(tIndex), bracketType, parseInt(rIndex), parseInt(mIndex));
    saveTournaments([...tournaments]);
    closeModal('scoreEntry');
    showTournamentDetails(tIndex);
});


const createMatchObject = (id) => ({ id, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null });

function generateBracket(index) {
    const t = tournaments[index];
    let teams = [...t.teams].sort(() => 0.5 - Math.random());
    const bracketSize = 2 ** Math.ceil(Math.log2(teams.length));
    const byes = bracketSize - teams.length;
    let round1 = [];
    let teamIdx = 0;

    for (let i = 0; i < bracketSize / 2; i++) {
        const match = createMatchObject(`r1_m${i}`);
        match.team1 = { id: teams[teamIdx].id, name: teams[teamIdx].teamName, logo: teams[teamIdx].logo };
        if (i < byes) {
            match.team2 = { id: 'BYE', name: 'BYE', logo: null };
            match.winner = match.team1.id;
            teamIdx++;
        } else {
            match.team2 = { id: teams[teamIdx + 1].id, name: teams[teamIdx + 1].teamName, logo: teams[teamIdx + 1].logo };
            teamIdx += 2;
        }
        round1.push(match);
    }
    
    if (t.format === 'single-elimination') {
        t.bracket = { rounds: [{ title: 'Round 1', matches: round1 }] };
        for (let r = 2, matches = bracketSize / 4; matches >= 1; r++, matches /= 2) {
            const title = matches === 1 ? 'Finals' : matches === 2 ? 'Semi-Finals' : `Round ${r}`;
            t.bracket.rounds.push({ title, matches: Array.from({ length: matches }, (_, i) => createMatchObject(`r${r}_m${i}`)) });
        }
    } else { 
        const upperRounds = [{ title: 'Upper Round 1', matches: round1 }];
        for (let r = 2, matches = bracketSize / 4; matches >= 1; r++, matches /= 2) {
            upperRounds.push({ title: `Upper Round ${r}`, matches: Array.from({ length: matches }, (_, i) => createMatchObject(`ur${r}_m${i}`)) });
        }
        const lowerRounds = [];
        for (let i = 0; i < (upperRounds.length - 1) * 2; i++) {
            const matchCount = Math.max(1, bracketSize / (2 ** (Math.floor(i / 2) + 2)));
            lowerRounds.push({ title: `Lower Round ${i + 1}`, matches: Array.from({ length: matchCount }, (_, j) => createMatchObject(`lr${i+1}_m${j}`)) });
        }
        t.bracket = { upper: upperRounds, lower: lowerRounds, grandFinal: createMatchObject('gf_m1') };
    }
    
    round1.forEach((match, i) => match.winner && handleMatchResult(index, 'upper', 0, i));
    saveTournaments([...tournaments]);
    showTournamentDetails(index);
}

function renderBracket(index) {
    const t = tournaments[index];
    const container = document.getElementById('bracketDisplayArea');
    if (!t.bracket) {
        container.innerHTML = `<p style="color: #bbb;">Bracket not generated yet.</p>`;
        return;
    }
    
    const renderRounds = (rounds, type) => rounds.map((r, rIdx) => `
        <div class="round">
            <div class="round-title">${r.title}</div>
            ${r.matches.map((m, mIdx) => {
                const canManage = currentUser === t.createdBy && m.team1 && m.team2 && m.team1.id !== 'BYE' && m.team2.id !== 'BYE' && !m.winner;
                return `
                <div class="match ${m.winner === m.team1?.id ? 'winner-top' : ''} ${m.winner === m.team2?.id ? 'winner-bottom' : ''}">
                    <div class="team team-top">${teamLogoHTML(m.team1)}<span class="team-name">${m.team1?.name || 'TBD'}</span><span class="team-score">${m.score1 ?? '-'}</span></div>
                    <div class="team team-bottom">${teamLogoHTML(m.team2)}<span class="team-name">${m.team2?.name || 'TBD'}</span><span class="team-score">${m.score2 ?? '-'}</span></div>
                    ${canManage ? `<button class="set-score-btn" onclick="openScoreModal(${index},'${type}',${rIdx},${mIdx})"><i class="fas fa-edit"></i></button>` : ''}
                </div>`;
            }).join('')}
        </div>`).join('');

    container.innerHTML = (t.format === 'single-elimination')
        ? `<div class="bracket-container">${renderRounds(t.bracket.rounds, 'upper')}</div>`
        : `<div class="bracket-section"><h4 class="bracket-heading">Upper Bracket</h4><div class="bracket-container">${renderRounds(t.bracket.upper, 'upper')}</div></div>
           <div class="bracket-section"><h4 class="bracket-heading">Lower Bracket</h4><div class="bracket-container">${renderRounds(t.bracket.lower, 'lower')}</div></div>
           <div class="bracket-section"><h4 class="bracket-heading">Grand Final</h4><div class="bracket-container">${renderRounds([{title:'', matches:[t.bracket.grandFinal]}], 'grandFinal')}</div></div>`;
}

function handleMatchResult(tIndex, type, rIndex, mIndex) {
    const t = tournaments[tIndex];
    if (!t.bracket || type === 'grandFinal') return;
    let match;
    if(type === 'lower') match = t.bracket.lower[rIndex].matches[mIndex];
    else match = (t.format === 'single-elimination') ? t.bracket.rounds[rIndex].matches[mIndex] : t.bracket.upper[rIndex].matches[mIndex];

    const winner = match.team1.id === match.winner ? match.team1 : match.team2;
    const loser = match.team1.id === match.loser ? match.team1 : match.team2;
    const nextMatchIdx = Math.floor(mIndex / 2);
    const isTopSlot = mIndex % 2 === 0;

    if (type === 'upper') {
        const nextRound = (t.format === 'single-elimination' ? t.bracket.rounds : t.bracket.upper)[rIndex + 1];
        if (nextRound) { 
            if (isTopSlot) nextRound.matches[nextMatchIdx].team1 = { ...winner }; else nextRound.matches[nextMatchIdx].team2 = { ...winner };
        } else if (t.format === 'double-elimination') t.bracket.grandFinal.team1 = { ...winner }; // Upper final winner
        
        if (t.format === 'double-elimination' && loser.id !== 'BYE') { 
            if (rIndex === 0) { 
                const lowerMatch = t.bracket.lower[0].matches[mIndex];
                if (lowerMatch) lowerMatch.team1 = { ...loser };
            } else { 
                const lowerMatch = t.bracket.lower[(rIndex * 2) - 1].matches[mIndex];
                if (lowerMatch) lowerMatch.team2 = { ...loser };
            }
        }
    } else if (type === 'lower') { 
        const nextRound = t.bracket.lower[rIndex + 1];
        if (nextRound) {
            if (isTopSlot) nextRound.matches[nextMatchIdx].team1 = { ...winner }; else nextRound.matches[nextMatchIdx].team2 = { ...winner };
        } else t.bracket.grandFinal.team2 = { ...winner }; 
    }
}

function renderBracketManagement(index) {
    const t = tournaments[index];
    const container = document.getElementById('bracketManagement');
    container.innerHTML = '';
    if (currentUser !== t.createdBy) return;

    let buttonsHTML = `<button class="delete-btn" onclick="deleteTournament(${index})">Delete Tournament</button>`;
    const regClosed = new Date() > new Date(t.regDeadline);
    const minTeams = t.format === 'double-elimination' ? 4 : 2;

    if (t.bracket) {
        buttonsHTML += `<button onclick="if(confirm('Reset bracket?')) resetBracket(${index})">Reset Bracket</button>`;
    } else if (regClosed && t.teams.length >= minTeams) {
        buttonsHTML += `<button onclick="generateBracket(${index})">Generate Bracket</button>`;
    }
    container.innerHTML = buttonsHTML;
}

function renderStandings(index) {
    const t = tournaments[index];
    const container = document.getElementById('standingsContainer');
    const standings = {};
    const gf = t.bracket?.grandFinal;

    if (gf?.winner) {
        standings['1st Place'] = gf.team1.id === gf.winner ? gf.team1.name : gf.team2.name;
        standings['2nd Place'] = gf.team1.id === gf.loser ? gf.team1.name : gf.team2.name;
        if (t.format === 'double-elimination') {
            const lowerFinal = t.bracket.lower.at(-1)?.matches[0];
            if (lowerFinal?.loser) standings['3rd Place'] = lowerFinal.team1.id === lowerFinal.loser ? lowerFinal.team1.name : lowerFinal.team2.name;
        } else {
            const semiFinals = t.bracket.rounds.at(-2);
            if(semiFinals) {
                const losers = semiFinals.matches.map(m => m.team1.id === m.loser ? m.team1 : m.team2);
                if (losers.length === 2) standings['3rd/4th Place'] = `${losers[0].name} & ${losers[1].name}`;
            }
        }
    }

    if (Object.keys(standings).length > 0) {
        container.innerHTML = `<ul class="standings-list">${Object.entries(standings).map(([place, name]) => `<li><strong>${place}:</strong> ${name}</li>`).join('')}</ul>`;
    } else {
        container.innerHTML = `<p style="color: #bbb;">Standings will be available after the tournament concludes.</p>`;
    }
}

function deleteTournament(index) {
    if (!confirm('Permanently delete this tournament?')) return;
    tournaments.splice(index, 1);
    saveTournaments([...tournaments]);
    closeModal('tournamentDetail');
}

function resetBracket(index) {
    tournaments[index].bracket = null;
    saveTournaments([...tournaments]);
    showTournamentDetails(index);
}

function openScoreModal(tIndex, bracketType, rIndex, mIndex) {
    let match;
    const t = tournaments[tIndex];
    if (bracketType === 'grandFinal') match = t.bracket.grandFinal;
    else if (bracketType === 'lower') match = t.bracket.lower[rIndex].matches[mIndex];
    else match = (t.format === 'single-elimination') ? t.bracket.rounds[rIndex].matches[mIndex] : t.bracket.upper[rIndex].matches[mIndex];
    
    Object.assign(DOM.scoreEntryForm.dataset, { tIndex, bracketType, rIndex, mIndex });
    document.getElementById('scoreTeam1Name').textContent = match.team1.name;
    document.getElementById('scoreTeam2Name').textContent = match.team2.name;
    DOM.scoreEntryForm.reset();
    openModal('scoreEntry');
    document.getElementById('scoreTeam1').focus();
}


document.addEventListener('DOMContentLoaded', () => {
    Object.assign(window, { openModal, closeModal, switchModal, showTournamentDetails, register, login, logout, generateBracket, resetBracket, deleteTournament, openScoreModal });

    const updateView = () => {
        const isHome = currentView === 'home';
        DOM.heroSection.style.display = isHome ? 'block' : 'none';
        DOM.listControls.style.display = isHome ? 'none' : 'flex';
        DOM.viewAllLink.style.display = isHome ? 'block' : 'none';
        DOM.listTitle.textContent = isHome ? 'Featured' : (currentView === 'my' ? 'My' : 'All') + ' Tournaments';
        renderTournaments();
    };

    const setView = (view) => (e) => {
        e.preventDefault();
        currentView = view;
        updateView();
        if(view === 'all') document.querySelector('.featured').scrollIntoView({ behavior: 'smooth' });
    };
    
    document.getElementById('navHome').addEventListener('click', setView('home'));
    document.getElementById('navAllTournaments').addEventListener('click', setView('all'));
    document.getElementById('navMyTournaments').addEventListener('click', (e) => { if (currentUser) setView('my')(e); });
    document.getElementById('heroBrowseBtn').addEventListener('click', setView('all'));
    document.getElementById('viewAllLink').addEventListener('click', setView('all'));

    ['searchInput', 'formatFilter', 'statusFilter'].forEach(id => {
        document.getElementById(id).addEventListener('input', renderTournaments);
    });

    updateAuthUI();
    updateView();
});
