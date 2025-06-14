const tournamentListContainer = document.getElementById('tournamentList');
const authButtonsContainer = document.getElementById('authButtons');
const tournamentForm = document.getElementById('tournamentForm');
const registerTeamForm = document.getElementById('registerTeamForm');
const scoreEntryForm = document.getElementById('scoreEntryForm');
const listTitle = document.getElementById('listTitle');

let tournaments;
try {
    tournaments = JSON.parse(localStorage.getItem('tournaments')) || [];
} catch (e) {
    tournaments = [];
}
let sessionUsers = JSON.parse(localStorage.getItem('sessionUsers')) || {}; 
let currentUser = localStorage.getItem('currentUser') || null;
let currentView = 'home';

function renderTournaments() {
    tournamentListContainer.innerHTML = '';
    
    const isHomePage = (currentView === 'home');

    let sourceTournaments = (currentView === 'my' && currentUser)
        ? tournaments.filter(t => t.createdBy === currentUser)
        : tournaments;

    let tournamentsToDisplay;

    if (isHomePage) {
        tournamentsToDisplay = sourceTournaments.slice(0, 4);
    } else {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const formatFilter = document.getElementById('formatFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;

        tournamentsToDisplay = sourceTournaments.filter(t => {
            const nameMatch = t.name.toLowerCase().includes(searchTerm);
            const formatMatch = (formatFilter === 'all' || t.format === formatFilter);
            
            let statusMatch = true;
            if (statusFilter !== 'all') {
                const finalMatch = t.format === 'single-elimination' 
                    ? t.bracket?.rounds[t.bracket.rounds.length - 1]?.matches[0]
                    : t.bracket?.grandFinal;
                const currentStatus = !!finalMatch?.winner ? 'completed' : 'ongoing';
                statusMatch = (currentStatus === statusFilter);
            }
            return nameMatch && formatMatch && statusMatch;
        });
    }

    if (tournamentsToDisplay.length === 0) {
        tournamentListContainer.innerHTML = "<p style='color:#bbb; text-align: left; grid-column: 1 / -1;'>No tournaments available.</p>";
        return;
    }
    
    tournamentsToDisplay.forEach(t => {
      const originalIndex = tournaments.findIndex(originalT => originalT.id === t.id);
      if (originalIndex === -1) return;
      const card = document.createElement('div');
      card.className = 'tournament-card';
      card.setAttribute('onclick', `showTournamentDetails(${originalIndex})`);
      
      const finalMatch = t.format === 'single-elimination' 
            ? t.bracket?.rounds[t.bracket.rounds.length - 1]?.matches[0]
            : t.bracket?.grandFinal;
      const status = finalMatch?.winner ? 'completed' : 'ongoing';
      card.innerHTML = `
          <div class="status-tag">${status}</div>
          <div class="tournament-title">${t.name}</div>
          <div class="meta">
            ${t.format.replace('-', ' ')} | Teams: ${(t.teams || []).length}/${t.maxTeams}
          </div>
          <p class="tournament-description">${t.description || 'No description.'}</p>
      `;
      tournamentListContainer.appendChild(card);
    });
}

function showTournamentDetails(index) {
    const t = tournaments[index];
    if (!t) return;
    
    document.getElementById('tournamentDetailModal').dataset.currentIndex = index;
    const now = new Date(), regDeadline = new Date(t.regDeadline);

    document.getElementById('detailName').textContent = t.name;
    document.getElementById('detailFormat').textContent = t.format.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.getElementById('detailTeamSize').textContent = `${t.teamSize}v${t.teamSize}`;
    document.getElementById('detailRegDeadline').textContent = regDeadline.toLocaleString();
    document.getElementById('detailStartDate').textContent = new Date(t.startDate).toLocaleString();
    document.getElementById('detailCreator').textContent = t.createdBy || 'N/A';
    document.getElementById('detailDescription').textContent = t.description || 'No description provided.';
    
    const teamsRegistered = t.teams ? t.teams.length : 0;
    document.getElementById('detailTeamsRegistered').textContent = `${teamsRegistered} / ${t.maxTeams}`;

    const teamsList = document.getElementById('detailTeamsList');
    teamsList.innerHTML = '';
    if (teamsRegistered > 0) {
        t.teams.forEach(team => {
            const logoHtml = team.logo ? `<img src="${team.logo}" alt="${team.teamName} Logo" class="team-list-logo">` : '';
            const rosterHtml = team.roster ? `<ul class="roster-list"><li><strong>Top:</strong> ${team.roster.top}</li><li><strong>Jungle:</strong> ${team.roster.jungle}</li><li><strong>Mid:</strong> ${team.roster.mid}</li><li><strong>Bot:</strong> ${team.roster.bot}</li><li><strong>Support:</strong> ${team.roster.support}</li></ul>` : '';
            const teamCard = document.createElement('div');
            teamCard.className = 'team-roster-card';
            teamCard.innerHTML = `<h4 class="team-roster-name">${logoHtml} ${team.teamName} <span class="captain-tag">(Captain: ${team.captainName})</span></h4>${rosterHtml}`;
            teamsList.appendChild(teamCard);
        });
    } else {
        teamsList.innerHTML = '<p>No teams registered yet.</p>';
    }

    const registerSection = document.getElementById('detailRegisterSection');
    registerSection.style.display = (currentUser && now < regDeadline && teamsRegistered < t.maxTeams) ? 'block' : 'none';
    if(registerSection.style.display === 'block') registerTeamForm.dataset.tournamentIndex = index;

    renderBracketManagement(index);
    renderBracket(index);
    renderStandings(index);
    openModal('tournamentDetail');
}

function updateAuthUI() {
    const myTournamentsLink = document.getElementById('navMyTournaments');
    const heroCreateBtn = document.getElementById('heroCreateBtn');
    if (currentUser) {
        authButtonsContainer.innerHTML = `<span>${currentUser}</span><button onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>`;
        myTournamentsLink.style.display = 'inline';
        if(heroCreateBtn) heroCreateBtn.style.display = 'inline-block';
    } else {
        authButtonsContainer.innerHTML = `<button onclick="openModal('login')">Login</button><button onclick="openModal('register')">Register</button>`;
        myTournamentsLink.style.display = 'none';
        if(heroCreateBtn) heroCreateBtn.style.display = 'none';
    }
}

function openModal(id) { document.getElementById(id + 'Modal').classList.add('show'); }
function closeModal(id) { document.getElementById(id + 'Modal').classList.remove('show'); }
function switchModal(from, to) { closeModal(from); openModal(to); }
function register() {
    const user = document.getElementById('regUser').value.trim(), pass = document.getElementById('regPass').value, pass2 = document.getElementById('regPass2').value;
    if (!user || !pass) return alert("Username and Password are required.");
    if (pass !== pass2) return alert("Passwords do not match.");
    if (sessionUsers[user]) return alert("Username already exists.");
    sessionUsers[user] = { password: pass };
    localStorage.setItem('sessionUsers', JSON.stringify(sessionUsers));
    alert("Registered successfully! You can now log in.");
    switchModal('register', 'login');
}
function login() {
    const user = document.getElementById('loginUser').value.trim(), pass = document.getElementById('loginPass').value;
    if (!sessionUsers[user] || sessionUsers[user].password !== pass) return alert("Invalid username or password.");
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
tournamentForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentUser) return alert("You must be logged in to create a tournament.");
    const formData = new FormData(e.target);
    const newTournament = Object.fromEntries(formData.entries());
    if (new Date(newTournament.startDate) <= new Date(newTournament.regDeadline)) return alert('Start Date must be after Registration Deadline.');
    if (newTournament.format === 'double-elimination' && newTournament.maxTeams < 4) return alert('Double Elimination tournaments require at least 4 teams.');
    newTournament.id = Date.now();
    newTournament.createdBy = currentUser;
    newTournament.teams = [];
    newTournament.bracket = null;
    tournaments.push(newTournament);
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    renderTournaments();
    closeModal('createTournament');
    e.target.reset();
});
registerTeamForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const index = parseInt(this.dataset.tournamentIndex, 10), t = tournaments[index];
    if (!t) return alert("Error: Tournament not found.");
    const newTeam = { 
        id: 'team_' + Date.now(), 
        teamName: document.getElementById('registerTeamName').value.trim(),
        logo: document.getElementById('registerTeamLogo').value.trim(), 
        captainName: document.getElementById('registerCaptainName').value.trim(), 
        roster: { 
            top: document.getElementById('registerTop').value.trim(), 
            jungle: document.getElementById('registerJungle').value.trim(), 
            mid: document.getElementById('registerMid').value.trim(), 
            bot: document.getElementById('registerBot').value.trim(), 
            support: document.getElementById('registerSupport').value.trim() 
        } 
    };
    if(!newTeam.teamName || !newTeam.captainName || !newTeam.roster.top) return alert("Please fill all required team fields.");
    if (!t.teams) t.teams = [];
    t.teams.push(newTeam);
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    alert("Team registered successfully!");
    e.target.reset();
    closeModal('tournamentDetail');
    renderTournaments();
    showTournamentDetails(index);
});


function renderBracketManagement(index) {
    const t = tournaments[index];
    const container = document.getElementById('bracketManagement');
    container.innerHTML = '';
    const canManage = currentUser && currentUser === t.createdBy;
    if (!canManage) return;
    const regClosed = new Date() > new Date(t.regDeadline);
    const minTeams = t.format === 'double-elimination' ? 4 : 2;
    if (!t.bracket && regClosed && t.teams.length >= minTeams) {
        container.innerHTML += `<button onclick="generateBracket(${index})">Generate Bracket</button>`;
    } else if (t.bracket) {
        container.innerHTML += `<button onclick="if(confirm('Are you sure? This will delete the current bracket and all scores.')) { resetBracket(${index}) }">Reset Bracket</button>`;
    }
    container.innerHTML += `<button class="delete-btn" onclick="deleteTournament(${index})">Delete Tournament</button>`;
}

function deleteTournament(index) {
    if (!confirm('Are you sure you want to permanently delete this tournament? This action cannot be undone.')) return;
    tournaments.splice(index, 1);
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    closeModal('tournamentDetail');
    renderTournaments();
}

function generateBracket(index) {
    const t = tournaments[index];
    if (t.format === 'single-elimination') {
        generateSingleEliminationBracket(index);
    } else if (t.format === 'double-elimination') {
        generateDoubleEliminationBracket(index);
    }
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    showTournamentDetails(index);
}

function resetBracket(index) {
    tournaments[index].bracket = null;
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    showTournamentDetails(index);
}

function generateSingleEliminationBracket(index) {
    const t = tournaments[index];
    let teams = [...t.teams].sort(() => Math.random() - 0.5);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teams.length)));
    const byes = bracketSize - teams.length;
    let round1 = [];
    let teamIndex = 0;
    for (let i = 0; i < bracketSize / 2; i++) {
        const match = { id: `r1_m${i}`, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null };
        const teamToPlace = { id: teams[teamIndex].id, name: teams[teamIndex].teamName, logo: teams[teamIndex].logo };
        if (i < byes) {
            match.team1 = teamToPlace;
            match.team2 = { id: 'BYE', name: 'BYE', logo: null };
            match.winner = match.team1.id;
            match.loser = match.team2.id;
            teamIndex++;
        } else {
            match.team1 = teamToPlace; teamIndex++;
            match.team2 = { id: teams[teamIndex].id, name: teams[teamIndex].teamName, logo: teams[teamIndex].logo }; teamIndex++;
        }
        round1.push(match);
    }
    round1.sort(() => Math.random() - 0.5);
    t.bracket = { rounds: [{ title: 'Round 1', matches: round1 }] };
    let numMatchesInRound = bracketSize / 4;
    let roundNum = 2;
    while (numMatchesInRound >= 1) {
        let nextRound = Array.from({ length: numMatchesInRound }, (_, i) => ({ id: `r${roundNum}_m${i}`, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null }));
        let title = `Round ${roundNum}`;
        if (numMatchesInRound === 1) title = 'Finals';
        if (numMatchesInRound === 2) title = 'Semi-Finals';
        t.bracket.rounds.push({ title: title, matches: nextRound });
        numMatchesInRound /= 2;
        roundNum++;
    }
    t.bracket.rounds[0].matches.forEach((match, matchIndex) => {
        if (match.winner) handleMatchResult(index, 'upper', 0, matchIndex);
    });
}

function generateDoubleEliminationBracket(index) {
    const t = tournaments[index];
    let teams = [...t.teams].sort(() => Math.random() - 0.5);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(teams.length)));
    const upperRounds = [];
    let upperRound1 = [];
    const byes = bracketSize - teams.length;
    let teamIndex = 0;
    for (let i = 0; i < bracketSize / 2; i++) {
        const match = { id: `ur1_m${i}`, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null };
        const teamToPlace = { id: teams[teamIndex].id, name: teams[teamIndex].teamName, logo: teams[teamIndex].logo };
        if (i < byes) {
            match.team1 = teamToPlace;
            match.team2 = { id: 'BYE', name: 'BYE', logo: null };
            match.winner = match.team1.id;
            match.loser = match.team2.id;
            teamIndex++;
        } else {
            match.team1 = teamToPlace; teamIndex++;
            match.team2 = { id: teams[teamIndex].id, name: teams[teamIndex].teamName, logo: teams[teamIndex].logo }; teamIndex++;
        }
        upperRound1.push(match);
    }
    upperRound1.sort(() => Math.random() - 0.5);
    upperRounds.push({ title: 'Upper Round 1', matches: upperRound1 });
    let numMatchesInRound = bracketSize / 4;
    let roundNum = 2;
    while (numMatchesInRound >= 1) {
        let nextRound = Array.from({ length: numMatchesInRound }, (_, i) => ({ id: `ur${roundNum}_m${i}`, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null }));
        let title = `Upper Round ${roundNum}`;
        if (numMatchesInRound === 1) title = 'Upper Final';
        upperRounds.push({ title: title, matches: nextRound });
        numMatchesInRound /= 2;
        roundNum++;
    }
    const lowerRounds = [];
    const lowerRoundCount = (upperRounds.length - 1) * 2;
    for (let i = 0; i < lowerRoundCount; i++) {
        let title = `Lower Round ${i + 1}`;
        let matchCount = (i % 2 === 0) ? (bracketSize / Math.pow(2, Math.floor(i / 2) + 2)) : (bracketSize / Math.pow(2, Math.floor(i / 2) + 2));
        if (matchCount < 1) matchCount = 1;
        if(i === lowerRoundCount - 1) title = 'Lower Final';
        let matches = Array.from({ length: matchCount }, (_, j) => ({ id: `lr${i+1}_m${j}`, team1: null, team2: null, score1: null, score2: null, winner: null, loser: null }));
        lowerRounds.push({ title, matches });
    }
    t.bracket = { upper: upperRounds, lower: lowerRounds, grandFinal: { id: 'gf_m1', team1: null, team2: null, score1: null, score2: null, winner: null, loser: null } };
    t.bracket.upper[0].matches.forEach((match, matchIndex) => {
        if (match.winner) handleMatchResult(index, 'upper', 0, matchIndex);
    });
}

function renderBracket(index) {
    const t = tournaments[index];
    const displayArea = document.getElementById('bracketDisplayArea');
    displayArea.innerHTML = '';
    if (!t.bracket) {
        displayArea.innerHTML = `<p style="color: #bbb;">Bracket will be generated when registration closes.</p>`;
        return;
    }
    const renderRounds = (rounds, bracketType) => {
        const container = document.createElement('div');
        container.className = 'bracket-container';
        rounds.forEach((round, rIndex) => {
            const roundDiv = document.createElement('div');
            roundDiv.className = 'round';
            roundDiv.innerHTML = `<div class="round-title">${round.title}</div>`;
            round.matches.forEach((match, mIndex) => {
                roundDiv.appendChild(createMatchElement(index, match, bracketType, rIndex, mIndex));
            });
            container.appendChild(roundDiv);
        });
        return container;
    };
    if (t.format === 'single-elimination') {
        displayArea.appendChild(renderRounds(t.bracket.rounds, 'upper'));
    } else if (t.format === 'double-elimination') {
        const upperSection = document.createElement('div');
        upperSection.className = 'bracket-section';
        upperSection.innerHTML = '<h4 class="bracket-heading">Upper Bracket</h4>';
        upperSection.appendChild(renderRounds(t.bracket.upper, 'upper'));
        displayArea.appendChild(upperSection);
        const lowerSection = document.createElement('div');
        lowerSection.className = 'bracket-section';
        lowerSection.innerHTML = '<h4 class="bracket-heading">Lower Bracket</h4>';
        lowerSection.appendChild(renderRounds(t.bracket.lower, 'lower'));
        displayArea.appendChild(lowerSection);
        const finalSection = document.createElement('div');
        finalSection.className = 'bracket-section';
        finalSection.innerHTML = '<h4 class="bracket-heading">Grand Final</h4>';
        const finalContainer = document.createElement('div');
        finalContainer.className = 'bracket-container';
        const finalRoundDiv = document.createElement('div');
        finalRoundDiv.className = 'round';
        finalRoundDiv.appendChild(createMatchElement(index, t.bracket.grandFinal, 'grandFinal', 0, 0));
        finalContainer.appendChild(finalRoundDiv);
        finalSection.appendChild(finalContainer);
        displayArea.appendChild(finalSection);
    }
}

function createMatchElement(tIndex, match, bracketType, rIndex, mIndex) {
    const t = tournaments[tIndex];
    const matchDiv = document.createElement('div');
    matchDiv.className = 'match';
    if (match.winner === match.team1?.id) matchDiv.classList.add('winner-top');
    if (match.winner === match.team2?.id) matchDiv.classList.add('winner-bottom');
    const team1Logo = match.team1?.logo ? `<img src="${match.team1.logo}" class="bracket-team-logo" alt="">` : `<div class="bracket-team-logo-placeholder"></div>`;
    const team2Logo = match.team2?.logo ? `<img src="${match.team2.logo}" class="bracket-team-logo" alt="">` : `<div class="bracket-team-logo-placeholder"></div>`;
    const team1Name = match.team1 ? match.team1.name : 'TBD', team2Name = match.team2 ? match.team2.name : 'TBD';
    const team1Score = match.score1 !== null ? match.score1 : '-', team2Score = match.score2 !== null ? match.score2 : '-';
    matchDiv.innerHTML = `<div class="team team-top">${team1Logo}<span class="team-name ${team1Name === 'BYE' ? 'bye' : ''}">${team1Name}</span><span class="team-score">${team1Score}</span></div><div class="team team-bottom">${team2Logo}<span class="team-name ${team2Name === 'BYE' ? 'bye' : ''}">${team2Name}</span><span class="team-score">${team2Score}</span></div>`;
    const canManage = currentUser && currentUser === t.createdBy;
    if (canManage && match.team1 && match.team2 && team1Name !== 'BYE' && team2Name !== 'BYE' && !match.winner) {
        const scoreBtn = document.createElement('button');
        scoreBtn.className = 'set-score-btn';
        scoreBtn.innerHTML = `<i class="fas fa-edit"></i>`;
        scoreBtn.title = 'Set Score';
        scoreBtn.onclick = () => openScoreModal(tIndex, bracketType, rIndex, mIndex);
        matchDiv.appendChild(scoreBtn);
    }
    return matchDiv;
}

function openScoreModal(tIndex, bracketType, rIndex, mIndex) {
    let match;
    if (bracketType === 'upper') {
        match = (tournaments[tIndex].format === 'single-elimination')
            ? tournaments[tIndex].bracket.rounds[rIndex].matches[mIndex]
            : tournaments[tIndex].bracket.upper[rIndex].matches[mIndex];
    } else if (bracketType === 'lower') {
        match = tournaments[tIndex].bracket.lower[rIndex].matches[mIndex];
    } else if (bracketType === 'grandFinal') {
        match = tournaments[tIndex].bracket.grandFinal;
    }
    scoreEntryForm.dataset.tIndex = tIndex;
    scoreEntryForm.dataset.bracketType = bracketType;
    scoreEntryForm.dataset.rIndex = rIndex;
    scoreEntryForm.dataset.mIndex = mIndex;
    document.getElementById('scoreTeam1Name').textContent = match.team1.name;
    document.getElementById('scoreTeam2Name').textContent = match.team2.name;
    scoreEntryForm.reset();
    openModal('scoreEntry');
    document.getElementById('scoreTeam1').focus();
}

scoreEntryForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const { tIndex, bracketType, rIndex, mIndex } = this.dataset;
    let match;
    if (bracketType === 'upper') {
        match = (tournaments[tIndex].format === 'single-elimination')
            ? tournaments[tIndex].bracket.rounds[rIndex].matches[mIndex]
            : tournaments[tIndex].bracket.upper[rIndex].matches[mIndex];
    } else if (bracketType === 'lower') {
        match = tournaments[tIndex].bracket.lower[rIndex].matches[mIndex];
    } else {
        match = tournaments[tIndex].bracket.grandFinal;
    }
    const score1 = parseInt(document.getElementById('scoreTeam1').value, 10);
    const score2 = parseInt(document.getElementById('scoreTeam2').value, 10);
    if (isNaN(score1) || isNaN(score2) || score1 === score2) return alert('Please enter valid, non-tying scores.');
    match.score1 = score1;
    match.score2 = score2;
    match.winner = score1 > score2 ? match.team1.id : match.team2.id;
    match.loser = score1 < score2 ? match.team1.id : match.team2.id;
    handleMatchResult(parseInt(tIndex), bracketType, parseInt(rIndex), parseInt(mIndex));
    localStorage.setItem('tournaments', JSON.stringify(tournaments));
    closeModal('scoreEntry');
    showTournamentDetails(tIndex);
});

function handleMatchResult(tIndex, bracketType, rIndex, mIndex) {
    const t = tournaments[tIndex];
    let match;
    if (bracketType === 'upper') {
        match = (t.format === 'single-elimination')
            ? t.bracket.rounds[rIndex].matches[mIndex]
            : t.bracket.upper[rIndex].matches[mIndex];
    } else if (bracketType === 'lower') {
        match = t.bracket.lower[rIndex].matches[mIndex];
    } else if (bracketType === 'grandFinal') {
        return;
    }
    if (!match || !match.winner) return;
    const winner = match.team1.id === match.winner ? match.team1 : match.team2;
    const loser = match.team1.id === match.loser ? match.team1 : match.team2;
    if (t.format === 'single-elimination') {
        const nextRoundIndex = rIndex + 1;
        if (nextRoundIndex >= t.bracket.rounds.length) return;
        const nextMatchIndex = Math.floor(mIndex / 2);
        const nextMatch = t.bracket.rounds[nextRoundIndex].matches[nextMatchIndex];
        if (mIndex % 2 === 0) nextMatch.team1 = { ...winner }; else nextMatch.team2 = { ...winner };
    } else if (t.format === 'double-elimination') {
        if (bracketType === 'upper') {
            const nextRoundIndex = rIndex + 1;
            if (nextRoundIndex >= t.bracket.upper.length) {
                t.bracket.grandFinal.team1 = { ...winner };
            } else {
                const nextMatchIndex = Math.floor(mIndex / 2);
                const nextMatch = t.bracket.upper[nextRoundIndex].matches[nextMatchIndex];
                if (mIndex % 2 === 0) nextMatch.team1 = { ...winner }; else nextMatch.team2 = { ...winner };
            }
        } else if (bracketType === 'lower') {
            const nextRoundIndex = rIndex + 1;
            if (nextRoundIndex >= t.bracket.lower.length) {
                t.bracket.grandFinal.team2 = { ...winner };
            } else {
                const nextMatchIndex = Math.floor(mIndex / 2);
                const nextMatch = t.bracket.lower[nextRoundIndex].matches[nextMatchIndex];
                if (mIndex % 2 === 0) nextMatch.team1 = { ...winner }; else nextMatch.team2 = { ...winner };
            }
        }
        if (bracketType === 'upper' && loser && loser.id !== 'BYE') {
            if (rIndex === 0) {
                const lowerMatch = t.bracket.lower[0].matches[mIndex];
                if (lowerMatch) lowerMatch.team1 = { ...loser };
            } else {
                const targetLowerRoundIndex = (rIndex * 2) - 1;
                const lowerMatch = t.bracket.lower[targetLowerRoundIndex].matches[mIndex];
                if(lowerMatch) lowerMatch.team2 = { ...loser };
            }
        }
    }
}

function renderStandings(index) {
    const t = tournaments[index];
    const container = document.getElementById('standingsContainer');
    if (!t.bracket) {
        container.innerHTML = `<p style="color: #bbb;">Standings will be available once matches have been played.</p>`;
        return;
    }
    const standings = {};
    if (t.format === 'single-elimination') {
        const finalMatch = t.bracket.rounds[t.bracket.rounds.length - 1].matches[0];
        if(finalMatch.winner) {
            standings['1st Place'] = finalMatch.team1.id === finalMatch.winner ? finalMatch.team1.name : finalMatch.team2.name;
            standings['2nd Place'] = finalMatch.team1.id !== finalMatch.winner ? finalMatch.team1.name : finalMatch.team2.name;
            if (t.bracket.rounds.length > 1) {
                const semiFinal = t.bracket.rounds[t.bracket.rounds.length - 2];
                if (semiFinal.matches[0] && semiFinal.matches[1]) {
                    const s1Loser = semiFinal.matches[0].team1.id === finalMatch.team1.id ? semiFinal.matches[0].team2 : semiFinal.matches[0].team1;
                    const s2Loser = semiFinal.matches[1].team1.id === finalMatch.team2.id ? semiFinal.matches[1].team2 : semiFinal.matches[1].team1;
                    if(s1Loser && s2Loser) standings['3rd/4th Place'] = `${s1Loser.name} & ${s2Loser.name}`;
                }
            }
        }
    } else if (t.format === 'double-elimination') {
        const finalMatch = t.bracket.grandFinal;
        if(finalMatch.winner) {
            standings['1st Place'] = finalMatch.team1.id === finalMatch.winner ? finalMatch.team1.name : finalMatch.team2.name;
            standings['2nd Place'] = finalMatch.team1.id !== finalMatch.winner ? finalMatch.team1.name : finalMatch.team2.name;
            const lowerFinal = t.bracket.lower[t.bracket.lower.length - 1].matches[0];
            if (lowerFinal.loser) {
                standings['3rd Place'] = lowerFinal.team1.id === lowerFinal.loser ? lowerFinal.team1.name : lowerFinal.team2.name;
            }
        }
    }
    if (Object.keys(standings).length > 0) {
        let html = '<ul class="standings-list">';
        for (const place in standings) html += `<li><strong>${place}:</strong> ${standings[place]}</li>`;
        html += '</ul>';
        container.innerHTML = html;
    } else {
        container.innerHTML = `<p style="color: #bbb;">Tournament in progress...</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.openModal = openModal; window.closeModal = closeModal; window.switchModal = switchModal;
    window.showTournamentDetails = showTournamentDetails; window.register = register; window.login = login;
    window.logout = logout; window.generateBracket = generateBracket; window.resetBracket = resetBracket;
    window.openScoreModal = openScoreModal; window.deleteTournament = deleteTournament;

    const heroSection = document.getElementById('heroSection');
    const listControls = document.querySelector('.list-controls');
    const viewAllLink = document.getElementById('viewAllLink');

    function updateView() {
        const isHomePage = currentView === 'home';

        heroSection.style.display = isHomePage ? 'block' : 'none';
        listControls.style.display = isHomePage ? 'none' : 'flex';
        viewAllLink.style.display = isHomePage ? 'block' : 'none';

        if (isHomePage) {
            listTitle.textContent = 'Featured Tournaments';
        } else if (currentView === 'my') {
            listTitle.textContent = 'My Tournaments';
        } else {
            listTitle.textContent = 'All Tournaments';
        }

        renderTournaments();
    }
    
    document.getElementById('navHome').addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'home';
        updateView();
    });
    document.getElementById('navAllTournaments').addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'all';
        updateView();
    });
    document.getElementById('navMyTournaments').addEventListener('click', (e) => {
        e.preventDefault();
        if (!currentUser) return;
        currentView = 'my';
        updateView();
    });
    
    document.getElementById('heroBrowseBtn').addEventListener('click', () => {
        currentView = 'all';
        updateView();
        document.querySelector('.featured').scrollIntoView({ behavior: 'smooth' });
    });
    viewAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentView = 'all';
        updateView();
        document.querySelector('.featured').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('searchInput').addEventListener('input', renderTournaments);
    document.getElementById('formatFilter').addEventListener('change', renderTournaments);
    document.getElementById('statusFilter').addEventListener('change', renderTournaments);

    updateAuthUI();
    updateView();
});


// THINGS TO ADD 
// FULLY DETAILED TEAM ROSTER
// REGISTERD TEAMS AND RECORDS