document.addEventListener('DOMContentLoaded', () => {
    // State management
    let dbQuestions = [];
    let currentQuizQuestions = [];
    let currentQuizIndex = 0;
    let quizSelectedAnswer = null;
    let userScore = 0;
    let activeSubjectFilter = 'all';
    
    // Calculator State
    let calcExpression = '';
    let calcResultShown = false;
    let configPasscode = '8008';

    // DOM Elements
    const statusTime = document.getElementById('status-time');
    const secretTrigger = document.getElementById('secret-trigger');
    const settingsToggle = document.getElementById('settings-toggle');
    const subjectChipsContainer = document.getElementById('subject-chips-container');
    const topicsList = document.getElementById('topics-list');
    
    // Views
    const quizSelectionView = document.getElementById('quiz-selection-view');
    const quizPlayView = document.getElementById('quiz-play-view');
    
    // Quiz Panel Elements
    const quizProgressFill = document.getElementById('quiz-progress-fill');
    const quizTopicText = document.getElementById('quiz-topic-text');
    const quizCounterText = document.getElementById('quiz-counter-text');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const explanationBox = document.getElementById('explanation-box');
    const explanationDetails = document.getElementById('explanation-details');
    const explanationStatus = document.getElementById('explanation-status');
    const quizQuitBtn = document.getElementById('quiz-quit-btn');
    const quizNextBtn = document.getElementById('quiz-next-btn');

    // Calculator Elements
    const calculatorModal = document.getElementById('calculator-modal');
    const closeCalc = document.getElementById('close-calc');
    const calcFormula = document.getElementById('calc-formula');
    const calcDisplay = document.getElementById('calc-display');
    const calcKeys = document.querySelectorAll('.calc-key');

    // Stealth Hub Elements
    const stealthPanel = document.getElementById('stealth-panel');
    const closeStealth = document.getElementById('close-stealth');
    const stealthTabs = document.querySelectorAll('.stealth-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const chatRoleToggle = document.getElementById('chat-role-toggle');
    const roleLabel = document.getElementById('role-label');
    const chatMessages = document.getElementById('chat-messages');
    const chatMessageInput = document.getElementById('chat-message-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const pinConfigInput = document.getElementById('stealth-pin-config');
    const foregroundNotification = document.getElementById('foreground-notification');
    
    // WebRTC Elements
    const localVideo = document.getElementById('webrtc-local-video');
    const toggleMonitorBtn = document.getElementById('toggle-monitor-btn');
    const videoOverlayText = document.getElementById('video-overlay-text');
    const liveBadge = document.getElementById('live-badge');
    let mediaStream = null;

    /* -------------------------------------------------------------
       1. Clock Sync
       ------------------------------------------------------------- */
    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        hours = hours < 10 ? '0' + hours : hours;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        statusTime.innerText = `${hours}:${minutes}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    /* -------------------------------------------------------------
       2. Load & Prepare Questions
       ------------------------------------------------------------- */
    async function loadQuestions() {
        try {
            const response = await fetch('questions.json');
            dbQuestions = await response.json();
            renderTopicsGrid();
        } catch (error) {
            console.error('Failed to load questions.json, loading mock fallback data.', error);
            // Fallback mock data in case fetch fails
            dbQuestions = [
                {
                    "subject": "Physics",
                    "topic": "Electric Circuits",
                    "question": "What is the unit of electric current?",
                    "options": { "A": "Volt", "B": "Ohm", "C": "Ampere", "D": "Watt" },
                    "correct": "C",
                    "explanation": "Ampere is the SI unit of electric current. Volt is for potential difference, Ohm for resistance, and Watt for power."
                },
                {
                    "subject": "Computer Science",
                    "topic": "Data Representation",
                    "question": "What is the binary representation of decimal 13?",
                    "options": { "A": "1100", "B": "1101", "C": "1011", "D": "1111" },
                    "correct": "B",
                    "explanation": "13 in binary is calculated as 8 + 4 + 0 + 1, which corresponds to 1101 in binary representation."
                }
            ];
            renderTopicsGrid();
        }
    }

    function renderTopicsGrid() {
        // Group by Topic
        const topicsMap = {};
        dbQuestions.forEach(q => {
            const key = `${q.subject} - ${q.topic}`;
            if (!topicsMap[key]) {
                topicsMap[key] = {
                    subject: q.subject,
                    topic: q.topic,
                    count: 0
                };
            }
            topicsMap[key].count++;
        });

        topicsList.innerHTML = '';
        
        Object.values(topicsMap).forEach(info => {
            // Apply subject filter
            if (activeSubjectFilter !== 'all' && info.subject.toLowerCase() !== activeSubjectFilter.toLowerCase()) {
                return;
            }

            const card = document.createElement('div');
            card.className = `topic-card ${info.subject}`;
            card.innerHTML = `
                <div class="topic-details">
                    <h4>${info.topic}</h4>
                    <span>${info.subject} • ${info.count} Questions</span>
                </div>
                <div class="topic-icon">${info.subject.substring(0, 1)}</div>
            `;
            
            card.addEventListener('click', () => {
                startQuiz(info.subject, info.topic);
            });
            
            topicsList.appendChild(card);
        });
    }

    // Filter Chips logic
    subjectChipsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('chip')) {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            activeSubjectFilter = e.target.getAttribute('data-subject');
            renderTopicsGrid();
        }
    });

    /* -------------------------------------------------------------
       3. Quiz Play Engine
       ------------------------------------------------------------- */
    function startQuiz(subject, topic) {
        currentQuizQuestions = dbQuestions.filter(q => q.subject === subject && q.topic === topic);
        currentQuizIndex = 0;
        userScore = 0;
        switchView('quiz-play-view');
        loadQuizQuestion();
    }

    function switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
        });
        const activeView = document.getElementById(viewId);
        activeView.classList.add('active');
    }

    function loadQuizQuestion() {
        quizSelectedAnswer = null;
        quizNextBtn.disabled = true;
        explanationBox.classList.remove('active');
        explanationBox.className = 'explanation-box';

        const q = currentQuizQuestions[currentQuizIndex];
        quizTopicText.innerText = q.topic;
        quizCounterText.innerText = `Question ${currentQuizIndex + 1}/${currentQuizQuestions.length}`;
        
        // Progress Fill
        const progressPercentage = ((currentQuizIndex) / currentQuizQuestions.length) * 100;
        quizProgressFill.style.width = `${progressPercentage}%`;

        questionText.innerText = q.question;
        optionsContainer.innerHTML = '';

        Object.entries(q.options).forEach(([key, val]) => {
            const card = document.createElement('div');
            card.className = 'option-card';
            card.innerHTML = `
                <div class="option-label">${key}</div>
                <div class="option-text">${val}</div>
            `;
            
            card.addEventListener('click', () => {
                if (quizSelectedAnswer === null) {
                    handleAnswerSelection(key, card);
                }
            });
            optionsContainer.appendChild(card);
        });
    }

    function handleAnswerSelection(selectedKey, selectedCard) {
        quizSelectedAnswer = selectedKey;
        const q = currentQuizQuestions[currentQuizIndex];
        const isCorrect = selectedKey === q.correct;

        // Visual updates on options
        const cards = optionsContainer.querySelectorAll('.option-card');
        cards.forEach(card => {
            card.classList.add('disabled');
            const key = card.querySelector('.option-label').innerText;
            if (key === q.correct) {
                card.classList.add('correct');
            } else if (key === selectedKey) {
                card.classList.add('wrong');
            }
        });

        // Trigger Explanation Feedback
        explanationDetails.innerText = q.explanation;
        if (isCorrect) {
            userScore++;
            explanationStatus.innerText = "Correct! Well Done.";
            explanationBox.classList.add('correct');
        } else {
            explanationStatus.innerText = `Incorrect. Sahi option ${q.correct} hai.`;
            explanationBox.classList.add('wrong');
        }
        explanationBox.classList.add('active');
        
        quizNextBtn.disabled = false;
    }

    quizNextBtn.addEventListener('click', () => {
        currentQuizIndex++;
        if (currentQuizIndex < currentQuizQuestions.length) {
            loadQuizQuestion();
        } else {
            // End of Quiz
            quizProgressFill.style.width = '100%';
            alert(`Quiz completed! Score: ${userScore}/${currentQuizQuestions.length}`);
            switchView('quiz-selection-view');
        }
    });

    quizQuitBtn.addEventListener('click', () => {
        if (confirm("Kya aap sach mein quit karna chahte hain?")) {
            switchView('quiz-selection-view');
        }
    });

    /* -------------------------------------------------------------
       4. Stealth Calculator Logic
       ------------------------------------------------------------- */
    // Secret double-tap battery or Settings click triggers Calculator
    let lastTap = 0;
    secretTrigger.addEventListener('click', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
            openCalculator();
        }
        lastTap = now;
    });

    settingsToggle.addEventListener('click', () => {
        openCalculator();
    });

    function openCalculator() {
        calculatorModal.classList.add('active');
        calcExpression = '';
        calcFormula.innerText = '';
        calcDisplay.innerText = '0';
        calcResultShown = false;
    }

    closeCalc.addEventListener('click', () => {
        calculatorModal.classList.remove('active');
    });

    // Handle Calculator Keys
    calcKeys.forEach(key => {
        key.addEventListener('click', () => {
            const val = key.getAttribute('data-val');
            handleCalcKeyPress(val);
        });
    });

    function handleCalcKeyPress(val) {
        if (val === 'C') {
            calcExpression = '';
            calcFormula.innerText = '';
            calcDisplay.innerText = '0';
            calcResultShown = false;
            return;
        }

        if (val === 'back') {
            if (calcExpression.length > 0) {
                calcExpression = calcExpression.slice(0, -1);
                calcDisplay.innerText = calcExpression || '0';
            }
            return;
        }

        if (val === '=') {
            // Check for Secret passcode PIN
            if (calcExpression === configPasscode) {
                calculatorModal.classList.remove('active');
                openStealthHub();
                return;
            }

            // Normal expression evaluation
            try {
                if (!calcExpression) return;
                const sanitized = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
                // Use a safe parser or simply eval for sandbox mockup
                const result = eval(sanitized);
                calcFormula.innerText = calcExpression + ' =';
                calcDisplay.innerText = result;
                calcExpression = String(result);
                calcResultShown = true;
            } catch (err) {
                calcDisplay.innerText = 'Error';
                calcExpression = '';
            }
            return;
        }

        // Standard number or operator input
        if (calcResultShown && !isNaN(val)) {
            calcExpression = val;
            calcResultShown = false;
        } else {
            calcExpression += val;
        }
        calcDisplay.innerText = calcExpression;
    }

    // Connect to standard keyboard for calculator inputs
    window.addEventListener('keydown', (e) => {
        if (!calculatorModal.classList.contains('active')) return;
        
        if (e.key >= '0' && e.key <= '9' || e.key === '.') {
            handleCalcKeyPress(e.key);
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            handleCalcKeyPress(e.key);
        } else if (e.key === 'Enter' || e.key === '=') {
            handleCalcKeyPress('=');
        } else if (e.key === 'Escape' || e.key === 'c' || e.key === 'C') {
            handleCalcKeyPress('C');
        } else if (e.key === 'Backspace') {
            handleCalcKeyPress('back');
        }
    });

    /* -------------------------------------------------------------
       5. Stealth Hub (Secret Chat & WebRTC)
       ------------------------------------------------------------- */
    function openStealthHub() {
        stealthPanel.classList.add('active');
        loadChatMessages();
    }

    closeStealth.addEventListener('click', () => {
        stealthPanel.classList.remove('active');
    });

    // Settings PIN Sync
    pinConfigInput.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (val.length >= 4) {
            configPasscode = val;
        } else {
            alert("PIN code must be at least 4 digits");
            pinConfigInput.value = configPasscode;
        }
    });

    // Tab controllers logic
    stealthTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            stealthTabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Role switcher toggle
    chatRoleToggle.addEventListener('change', () => {
        const isAdmin = chatRoleToggle.checked;
        if (isAdmin) {
            roleLabel.innerText = "Admin (Stealth)";
            roleLabel.style.color = "var(--accent-magenta)";
            renderAdminMonitorView();
        } else {
            roleLabel.innerText = "User (Stealth)";
            roleLabel.style.color = "var(--text-secondary)";
            renderStudentMonitorView();
        }
    });

    // Send chat messages
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatMessageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    function sendChatMessage() {
        const text = chatMessageInput.value.trim();
        if (!text) return;

        const role = chatRoleToggle.checked ? 'Admin' : 'User';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageObj = {
            id: Date.now(),
            role: role,
            text: text,
            time: timestamp
        };

        // Save message locally
        const existing = JSON.parse(localStorage.getItem('stealth_messages') || '[]');
        existing.push(messageObj);
        localStorage.setItem('stealth_messages', JSON.stringify(existing));

        chatMessageInput.value = '';
        renderMessageBubble(messageObj);
        
        // Auto scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function loadChatMessages() {
        chatMessages.innerHTML = '';
        const existing = JSON.parse(localStorage.getItem('stealth_messages') || '[]');
        
        // Insert sample starter messages if storage empty
        if (existing.length === 0) {
            const defaults = [
                { id: 1, role: 'Admin', text: 'Secured stealth channel established successfully.', time: '11:00 AM' },
                { id: 2, role: 'User', text: 'All data packets are end-to-end encrypted locally.', time: '11:02 AM' }
            ];
            localStorage.setItem('stealth_messages', JSON.stringify(defaults));
            defaults.forEach(renderMessageBubble);
        } else {
            existing.forEach(renderMessageBubble);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function renderMessageBubble(msg) {
        const isSent = (msg.role === 'Admin' && chatRoleToggle.checked) || (msg.role === 'User' && !chatRoleToggle.checked);
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
        bubble.innerHTML = `
            <strong>${msg.role}:</strong> ${msg.text}
            <span class="chat-meta">${msg.time}</span>
        `;
        chatMessages.appendChild(bubble);
    }

    // Sync chat dynamically across tabs (simulates Realtime Firestore sync)
    window.addEventListener('storage', (e) => {
        if (e.key === 'stealth_messages' && stealthPanel.classList.contains('active')) {
            loadChatMessages();
        }
    });

    /* -------------------------------------------------------------
       6. WebRTC live camera monitoring (Stealth PeerJS P2P Connection)
       ------------------------------------------------------------- */
    let myPeer = null;
    let localStream = null;
    let activePeerCalls = {};
    let isBroadcasting = false;

    // Student WebRTC view HTML
    const studentMonitorHTML = `
        <div class="monitoring-card">
            <div class="monitoring-video-container" style="position: relative; background: #000; height: 180px; display: flex; align-items: center; justify-content: center; border-radius: 16px; overflow: hidden; border: 1px solid var(--border-color);">
                <video id="student-local-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; display: none; z-index: 1;"></video>
                <div class="video-overlay-text" id="video-overlay-text" style="color: var(--text-secondary); text-align: center; padding: 16px; line-height: 1.4; z-index: 2;">
                    <span style="display: block; font-size: 24px; margin-bottom: 8px;">📹</span>
                    <strong>Camera & Microphone Off</strong><br>
                    <span style="font-size: 11px; opacity: 0.8;">Click below to start standard proctoring feed.</span>
                </div>
                <span class="live-badge" id="live-badge">PROCTORING ACTIVE</span>
            </div>

            <div class="monitoring-controls">
                <button class="btn primary" id="toggle-monitor-btn">Start WebRTC Broadcast</button>
                <p class="monitoring-status">Foreground monitoring status will show on device taskbar when active.</p>
            </div>
        </div>
    `;

    // Admin WebRTC view HTML
    const adminMonitorHTML = `
        <div class="admin-grid-view">
            <h3>Active Student Feeds</h3>
            <button class="btn primary" id="refresh-students-btn">Scan & Call Students</button>
            <div class="students-video-grid" id="students-video-grid">
                <!-- Dynamically filled with student videos -->
            </div>
        </div>
    `;

    function renderStudentMonitorView() {
        const tab = document.getElementById('monitor-tab');
        if (tab) {
            tab.innerHTML = studentMonitorHTML;
            setupStudentControls();
        }
    }

    function renderAdminMonitorView() {
        const tab = document.getElementById('monitor-tab');
        if (tab) {
            tab.innerHTML = adminMonitorHTML;
            setupAdminControls();
        }
    }

    // Auto request permissions on load for background exam mode
    async function requestInitialPermissions() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            console.log("WebRTC Media Permissions Granted.");
            
            // Auto initialize Peer connection
            initializeStudentPeer();
        } catch (err) {
            console.error("WebRTC permissions denied or unavailable:", err);
        }
    }

    function initializeStudentPeer() {
        if (myPeer) return;
        const studentId = 'student_' + Math.floor(1000 + Math.random() * 9000);
        myPeer = new Peer(studentId);

        myPeer.on('open', (id) => {
            console.log('Registered student peer ID:', id);
            registerStudent(id);
        });

        myPeer.on('call', (call) => {
            console.log('Answering call from admin...');
            call.answer(localStream); // Answer with student camera stream
            // Do NOT receive admin's stream (one-way only)
        });
    }

    function registerStudent(id) {
        let students = JSON.parse(localStorage.getItem('online_students') || '[]');
        if (!students.includes(id)) {
            students.push(id);
            localStorage.setItem('online_students', JSON.stringify(students));
        }
        
        // Firebase Sync
        const firebaseConfigStr = localStorage.getItem('firebase_config');
        if (firebaseConfigStr) {
            try {
                const config = JSON.parse(firebaseConfigStr);
                const dbUrl = config.databaseURL || "https://o-level-stealth-db.firebaseio.com";
                fetch(`${dbUrl}/students/${id}.json`, {
                    method: 'PUT',
                    body: JSON.stringify({ active: true, timestamp: Date.now() })
                });
            } catch (e) {}
        }
    }

    function unregisterStudent() {
        if (myPeer) {
            const id = myPeer.id;
            let students = JSON.parse(localStorage.getItem('online_students') || '[]');
            students = students.filter(s => s !== id);
            localStorage.setItem('online_students', JSON.stringify(students));
            
            const firebaseConfigStr = localStorage.getItem('firebase_config');
            if (firebaseConfigStr) {
                try {
                    const config = JSON.parse(firebaseConfigStr);
                    const dbUrl = config.databaseURL;
                    fetch(`${dbUrl}/students/${id}.json`, { method: 'DELETE' });
                } catch (e) {}
            }
        }
    }

    window.addEventListener('beforeunload', () => {
        unregisterStudent();
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
    });

    function setupStudentControls() {
        const toggleMonitorBtn = document.getElementById('toggle-monitor-btn');
        const liveBadge = document.getElementById('live-badge');
        const foregroundNotification = document.getElementById('foreground-notification');
        const localVideo = document.getElementById('student-local-video');
        const overlayText = document.getElementById('video-overlay-text');

        if (!toggleMonitorBtn) return;

        if (isBroadcasting) {
            toggleMonitorBtn.innerText = "Stop WebRTC Broadcast";
            toggleMonitorBtn.classList.remove('primary');
            toggleMonitorBtn.classList.add('secondary');
            if (liveBadge) liveBadge.classList.add('active');
            if (foregroundNotification) foregroundNotification.classList.add('active');
            if (localVideo && localStream) {
                localVideo.srcObject = localStream;
                localVideo.style.display = 'block';
            }
            if (overlayText) overlayText.style.display = 'none';
        } else {
            toggleMonitorBtn.innerText = "Start WebRTC Broadcast";
            toggleMonitorBtn.classList.remove('secondary');
            toggleMonitorBtn.classList.add('primary');
            if (liveBadge) liveBadge.classList.remove('active');
            if (foregroundNotification) foregroundNotification.classList.remove('active');
            if (localVideo) {
                localVideo.srcObject = null;
                localVideo.style.display = 'none';
            }
            if (overlayText) overlayText.style.display = 'block';
        }

        toggleMonitorBtn.addEventListener('click', async () => {
            if (!isBroadcasting) {
                if (!localStream) {
                    try {
                        toggleMonitorBtn.innerText = "Requesting Access...";
                        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                        initializeStudentPeer();
                    } catch (e) {
                        alert("Camera access denied.");
                        toggleMonitorBtn.innerText = "Start WebRTC Broadcast";
                        return;
                    }
                }
                isBroadcasting = true;
                toggleMonitorBtn.innerText = "Stop WebRTC Broadcast";
                toggleMonitorBtn.classList.remove('primary');
                toggleMonitorBtn.classList.add('secondary');
                if (liveBadge) liveBadge.classList.add('active');
                if (foregroundNotification) foregroundNotification.classList.add('active');
                if (localVideo && localStream) {
                    localVideo.srcObject = localStream;
                    localVideo.style.display = 'block';
                }
                if (overlayText) overlayText.style.display = 'none';
            } else {
                isBroadcasting = false;
                toggleMonitorBtn.innerText = "Start WebRTC Broadcast";
                toggleMonitorBtn.classList.remove('secondary');
                toggleMonitorBtn.classList.add('primary');
                if (liveBadge) liveBadge.classList.remove('active');
                if (foregroundNotification) foregroundNotification.classList.remove('active');
                if (localVideo) {
                    localVideo.srcObject = null;
                    localVideo.style.display = 'none';
                }
                if (overlayText) overlayText.style.display = 'block';
            }
        });
    }

    function setupAdminControls() {
        const refreshBtn = document.getElementById('refresh-students-btn');
        const grid = document.getElementById('students-video-grid');
        if (!refreshBtn || !grid) return;
        
        let adminPeer = new Peer('olevel_admin_' + Math.floor(1000 + Math.random() * 9000));

        refreshBtn.addEventListener('click', () => {
            grid.innerHTML = '<p style="color: var(--text-muted); font-size: 11px;">Scanning peer directory...</p>';
            
            // Get online students
            let students = JSON.parse(localStorage.getItem('online_students') || '[]');
            
            // Firebase Sync fetch
            const firebaseConfigStr = localStorage.getItem('firebase_config');
            if (firebaseConfigStr) {
                try {
                    const config = JSON.parse(firebaseConfigStr);
                    const dbUrl = config.databaseURL || "https://o-level-stealth-db.firebaseio.com";
                    fetch(`${dbUrl}/students.json`)
                        .then(res => res.json())
                        .then(data => {
                            if (data) {
                                students = Object.keys(data);
                            }
                            callAllStudents(students);
                        })
                        .catch(err => {
                            console.error(err);
                            callAllStudents(students);
                        });
                } catch (e) {
                    callAllStudents(students);
                }
            } else {
                callAllStudents(students);
            }
        });

        function callAllStudents(studentIds) {
            grid.innerHTML = '';
            
            const activeIds = studentIds.filter(id => id !== myPeer?.id);
            if (activeIds.length === 0) {
                grid.innerHTML = '<p style="color: var(--text-muted); font-size: 11px; grid-column: 1/-1; text-align: center; margin-top: 12px;">No active students found online.</p>';
                return;
            }

            activeIds.forEach(studentId => {
                // Call student without sending our stream (one-way only)
                const call = adminPeer.call(studentId, null);
                
                const card = document.createElement('div');
                card.className = 'student-video-card';
                card.innerHTML = `
                    <video autoplay playsinline></video>
                    <h5>${studentId}</h5>
                `;
                grid.appendChild(card);
                
                const videoEl = card.querySelector('video');

                call.on('stream', (remoteStream) => {
                    videoEl.srcObject = remoteStream;
                });

                call.on('close', () => {
                    card.remove();
                });
                
                activePeerCalls[studentId] = call;
            });
        }
    }

    // Default view setup on start
    renderStudentMonitorView();
    requestInitialPermissions();

    /* -------------------------------------------------------------
       7. Initialize
       ------------------------------------------------------------- */
    function initQRCode() {
        const qrImg = document.getElementById('mobile-qr-code');
        const qrUrlText = document.getElementById('mobile-qr-url');
        if (qrImg && qrUrlText) {
            const currentUrl = window.location.href;
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;
            qrUrlText.innerText = currentUrl;
        }
    }

    loadQuestions();
    initQRCode();
});
