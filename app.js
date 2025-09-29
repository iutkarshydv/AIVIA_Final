// AIVIA Mock Interview Platform - Main Application Logic

class AIVIAApp {
    constructor() {
        this.jobRoles = [
            {
                id: "SDE",
                name: "Software Development Engineer",
                description: "Algorithm & system design focused interview",
                color: "#3B82F6",
                icon: "💻",
                questions: [
                    "Tell me about a challenging algorithm problem you've solved recently?",
                    "How would you design a scalable web crawler?",
                    "What's your approach to code reviews and quality?",
                    "Explain the time complexity of your favorite sorting algorithm."
                ]
            },
            {
                id: "Data Analysis",
                name: "Data Analyst", 
                description: "Analytics & insights focused interview",
                color: "#10B981",
                icon: "📊",
                questions: [
                    "Walk me through a data analysis project where you discovered insights?",
                    "How do you handle missing data in your analysis?",
                    "What visualization would you use for time series data?",
                    "Explain your approach to A/B testing."
                ]
            },
            {
                id: "Full Stack",
                name: "Full Stack Developer",
                description: "End-to-end development interview", 
                color: "#8B5CF6",
                icon: "🔧",
                questions: [
                    "Describe a full-stack project you've built from scratch?",
                    "How do you decide between different technology stacks?",
                    "What's your approach to API design?",
                    "How do you handle state management in complex applications?"
                ]
            },
            {
                id: "Backend",
                name: "Backend Developer",
                description: "Server-side & architecture interview",
                color: "#EF4444", 
                icon: "⚙️",
                questions: [
                    "Tell me about a scalable system or API you've designed?",
                    "How do you approach database optimization?",
                    "Explain your strategy for handling high traffic?",
                    "What's your experience with microservices?"
                ]
            },
            {
                id: "Frontend", 
                name: "Frontend Developer",
                description: "UI/UX & client-side interview",
                color: "#F59E0B",
                icon: "🎨",
                questions: [
                    "Describe a complex UI component you've built?",
                    "How do you optimize frontend performance?",
                    "What's your approach to responsive design?",
                    "Explain your experience with modern frameworks."
                ]
            },
            {
                id: "DevOps",
                name: "DevOps Engineer", 
                description: "Infrastructure & automation interview",
                color: "#6366F1",
                icon: "🚀",
                questions: [
                    "Walk me through a CI/CD pipeline you've implemented?",
                    "How do you approach infrastructure as code?",
                    "What's your experience with container orchestration?",
                    "Explain your monitoring and alerting strategy."
                ]
            }
        ];

        this.mockResponses = [
            "That's an interesting approach. Can you elaborate on the technical challenges?",
            "I see you have experience with that technology. How did you handle scalability?", 
            "Great! Now let's dive deeper into the implementation details.",
            "That's a solid solution. What alternative approaches did you consider?",
            "Excellent point. How would you improve this in a production environment?"
        ];

        this.state = {
            currentScreen: 'role-selection',
            selectedRole: null,
            uploadedFile: null,
            interviewActive: false,
            currentQuestionIndex: 0,
            interviewStartTime: null,
            interviewDuration: 0,
            avatarState: 'ready', // ready, listening, speaking
            isMuted: false
        };

        this.timers = {
            interview: null,
            avatar: null,
            setup: null
        };

        this.init();
    }

    init() {
        this.renderRoles();
        this.bindEvents();
        console.log('AIVIA App initialized');
    }

    // Render job roles
    renderRoles() {
        const rolesGrid = document.getElementById('roles-grid');
        if (!rolesGrid) return;
        
        rolesGrid.innerHTML = '';

        this.jobRoles.forEach(role => {
            const roleCard = document.createElement('div');
            roleCard.className = 'role-card';
            roleCard.setAttribute('data-role', role.id);
            roleCard.style.setProperty('--role-color', role.color);
            
            roleCard.innerHTML = `
                <div class="role-icon">${role.icon}</div>
                <h3>${role.name}</h3>
                <p>${role.description}</p>
            `;
            
            rolesGrid.appendChild(roleCard);
        });
    }

    // Bind all event listeners
    bindEvents() {
        // Logo navigation
        const logo = document.querySelector('.logo h1');
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // Role selection - Fixed to prevent multiple selections
        const rolesGrid = document.getElementById('roles-grid');
        if (rolesGrid) {
            rolesGrid.addEventListener('click', (e) => {
                const roleCard = e.target.closest('.role-card');
                if (roleCard) {
                    const roleId = roleCard.getAttribute('data-role');
                    const role = this.jobRoles.find(r => r.id === roleId);
                    if (role) {
                        this.selectRole(role);
                    }
                }
            });
        }

        // Resume upload
        this.bindUploadEvents();

        // Navigation buttons - Fixed event binding
        const backToRolesBtn = document.getElementById('back-to-roles');
        if (backToRolesBtn) {
            backToRolesBtn.addEventListener('click', () => {
                this.showScreen('role-selection');
            });
        }

        const startInterviewBtn = document.getElementById('start-interview');
        if (startInterviewBtn) {
            startInterviewBtn.addEventListener('click', () => {
                console.log('Start interview clicked');
                this.startInterviewSetup();
            });
        }

        // Interview controls
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn) {
            startStopBtn.addEventListener('click', () => {
                this.toggleInterview();
            });
        }

        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }

        const endInterviewBtn = document.getElementById('end-interview');
        if (endInterviewBtn) {
            endInterviewBtn.addEventListener('click', () => {
                this.endInterview();
            });
        }

        const startNewInterviewBtn = document.getElementById('start-new-interview');
        if (startNewInterviewBtn) {
            startNewInterviewBtn.addEventListener('click', () => {
                this.resetApp();
            });
        }

        // Error handling
        const closeErrorBtn = document.getElementById('close-error');
        if (closeErrorBtn) {
            closeErrorBtn.addEventListener('click', () => {
                this.hideError();
            });
        }
    }

    // Bind upload-related events - Fixed implementation
    bindUploadEvents() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('file-input');
        const uploadTrigger = document.querySelector('.upload-trigger');
        const removeFileBtn = document.getElementById('remove-file');

        if (!uploadArea || !fileInput) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        // Handle dropped files
        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;

            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        }, false);

        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Upload trigger button
        if (uploadTrigger) {
            uploadTrigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileInput.click();
            });
        }

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Remove file button
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', () => {
                this.removeFile();
            });
        }
    }

    // Select a job role - Fixed to prevent multiple selections
    selectRole(role) {
        // Remove all previous selections
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.remove('selected');
        });

        // Select current role
        const selectedCard = document.querySelector(`[data-role="${role.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }

        this.state.selectedRole = role;
        console.log('Selected role:', role.name);

        // Auto-advance after brief delay
        setTimeout(() => {
            this.showScreen('resume-upload');
        }, 800);
    }

    // Handle file upload - Fixed validation and simulation
    handleFileUpload(file) {
        console.log('Handling file upload:', file.name);

        // Validate file type
        const validTypes = [
            'application/pdf', 
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];
        
        const isValidType = validTypes.includes(file.type) || 
                           file.name.toLowerCase().endsWith('.pdf') ||
                           file.name.toLowerCase().endsWith('.docx') ||
                           file.name.toLowerCase().endsWith('.doc');

        if (!isValidType) {
            this.showError('Please upload a PDF or DOCX file');
            return;
        }

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showError('File size must be less than 10MB');
            return;
        }

        // Show upload progress
        this.showUploadProgress(file);
    }

    // Show upload progress - Fixed implementation
    showUploadProgress(file) {
        const uploadArea = document.getElementById('upload-area');
        const uploadProgress = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');

        if (!uploadArea || !uploadProgress || !progressFill || !progressText) return;

        uploadArea.classList.add('hidden');
        uploadProgress.classList.remove('hidden');

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5 + Math.random() * 15; // More consistent progress
            if (progress > 100) progress = 100;

            progressFill.style.width = progress + '%';
            progressText.textContent = `Uploading... ${Math.round(progress)}%`;

            if (progress >= 100) {
                clearInterval(progressInterval);
                setTimeout(() => {
                    this.completeUpload(file);
                }, 500);
            }
        }, 150);
    }

    // Complete file upload
    completeUpload(file) {
        console.log('Upload completed:', file.name);

        const uploadProgress = document.getElementById('upload-progress');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        const startButton = document.getElementById('start-interview');

        if (uploadProgress) uploadProgress.classList.add('hidden');
        if (fileInfo) fileInfo.classList.remove('hidden');
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        
        this.state.uploadedFile = file;
        
        if (startButton) {
            startButton.disabled = false;
            startButton.classList.remove('btn--outline');
            startButton.classList.add('btn--primary');
        }
    }

    // Remove uploaded file
    removeFile() {
        const uploadArea = document.getElementById('upload-area');
        const fileInfo = document.getElementById('file-info');
        const startButton = document.getElementById('start-interview');
        const fileInput = document.getElementById('file-input');

        if (uploadArea) uploadArea.classList.remove('hidden');
        if (fileInfo) fileInfo.classList.add('hidden');
        
        this.state.uploadedFile = null;
        
        if (startButton) {
            startButton.disabled = true;
            startButton.classList.remove('btn--primary');
            startButton.classList.add('btn--outline');
        }
        
        if (fileInput) fileInput.value = '';
    }

    // Start interview setup - Fixed implementation
    startInterviewSetup() {
        console.log('Starting interview setup');
        this.showScreen('interview-setup');
        this.simulateSetupProcess();
    }

    // Simulate the setup process
    simulateSetupProcess() {
        const steps = ['step-1', 'step-2', 'step-3'];
        let currentStep = 0;

        const processStep = () => {
            if (currentStep > 0) {
                const prevStep = document.getElementById(steps[currentStep - 1]);
                const prevIcon = prevStep?.querySelector('.step-icon');
                if (prevIcon) {
                    prevIcon.textContent = '✓';
                }
            }

            if (currentStep < steps.length) {
                const step = document.getElementById(steps[currentStep]);
                if (step) {
                    step.classList.add('active');
                }
                
                currentStep++;
                this.timers.setup = setTimeout(processStep, 1500); // Faster progression
            } else {
                // Setup complete, start interview
                setTimeout(() => {
                    this.startVoiceInterview();
                }, 1000);
            }
        };

        processStep();
    }

    // Start voice interview
    startVoiceInterview() {
        console.log('Starting voice interview');
        this.showScreen('voice-interview');
        
        // Update role display
        const currentRoleElement = document.getElementById('current-role');
        if (currentRoleElement && this.state.selectedRole) {
            currentRoleElement.textContent = this.state.selectedRole.name;
        }

        // Initialize interview UI
        this.updateInterviewProgress();
        this.updateCurrentQuestion();
        this.setAvatarState('ready');
    }

    // Toggle interview start/stop
    toggleInterview() {
        const startStopBtn = document.getElementById('start-stop-btn');
        const btnText = startStopBtn?.querySelector('.btn-text');

        if (!this.state.interviewActive) {
            // Start interview
            this.state.interviewActive = true;
            this.state.interviewStartTime = Date.now();
            this.state.currentQuestionIndex = 0;
            
            if (btnText) btnText.textContent = 'Stop Interview';
            if (startStopBtn) startStopBtn.classList.add('active');
            
            this.startInterviewTimer();
            this.beginQuestionFlow();
        } else {
            // Stop interview
            this.pauseInterview();
        }
    }

    // Begin question flow
    beginQuestionFlow() {
        this.setAvatarState('speaking');
        this.updateCurrentQuestion();
        
        // Simulate AI speaking the question
        setTimeout(() => {
            if (this.state.interviewActive) {
                this.setAvatarState('listening');
                this.simulateInterviewFlow();
            }
        }, 3000);
    }

    // Simulate interview flow
    simulateInterviewFlow() {
        if (!this.state.interviewActive) return;

        // Simulate user speaking for 10-20 seconds
        const speakingTime = 10000 + Math.random() * 10000;
        
        setTimeout(() => {
            if (!this.state.interviewActive) return;
            
            // AI responds
            this.setAvatarState('speaking');
            
            // Show mock AI response
            const response = this.mockResponses[Math.floor(Math.random() * this.mockResponses.length)];
            this.updateCurrentQuestion(response);
            
            setTimeout(() => {
                if (!this.state.interviewActive) return;
                
                // Move to next question or end
                this.state.currentQuestionIndex++;
                
                if (this.state.currentQuestionIndex < this.getCurrentQuestions().length) {
                    this.updateInterviewProgress();
                    this.beginQuestionFlow();
                } else {
                    // Interview complete
                    this.completeInterview();
                }
            }, 3000);
            
        }, speakingTime);
    }

    // Pause interview
    pauseInterview() {
        this.state.interviewActive = false;
        
        const startStopBtn = document.getElementById('start-stop-btn');
        const btnText = startStopBtn?.querySelector('.btn-text');
        
        if (btnText) btnText.textContent = 'Resume Interview';
        if (startStopBtn) startStopBtn.classList.remove('active');
        
        this.setAvatarState('ready');
        this.clearTimers();
    }

    // Toggle mute
    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        
        const muteBtn = document.getElementById('mute-btn');
        const btnText = muteBtn?.querySelector('.btn-text');
        
        if (this.state.isMuted) {
            if (btnText) btnText.textContent = '🎤 Muted';
            if (muteBtn) muteBtn.classList.add('active');
        } else {
            if (btnText) btnText.textContent = '🎤 Unmuted';
            if (muteBtn) muteBtn.classList.remove('active');
        }
    }

    // End interview
    endInterview() {
        this.state.interviewActive = false;
        this.clearTimers();
        this.completeInterview();
    }

    // Complete interview
    completeInterview() {
        this.state.interviewActive = false;
        this.clearTimers();
        
        // Update completion stats
        const finalDuration = document.getElementById('final-duration');
        const questionsCompleted = document.getElementById('questions-completed');
        
        if (finalDuration) {
            finalDuration.textContent = this.formatDuration(this.state.interviewDuration);
        }
        
        if (questionsCompleted && this.state.selectedRole) {
            const total = this.getCurrentQuestions().length;
            questionsCompleted.textContent = `${Math.min(this.state.currentQuestionIndex + 1, total)}/${total}`;
        }
        
        this.showScreen('interview-complete');
    }

    // Start interview timer
    startInterviewTimer() {
        this.timers.interview = setInterval(() => {
            this.state.interviewDuration = Date.now() - this.state.interviewStartTime;
            
            const timeElement = document.getElementById('interview-time');
            if (timeElement) {
                timeElement.textContent = this.formatDuration(this.state.interviewDuration);
            }
        }, 1000);
    }

    // Update interview progress
    updateInterviewProgress() {
        const currentQuestionElement = document.getElementById('current-question');
        const totalQuestionsElement = document.getElementById('total-questions');
        const progressFill = document.getElementById('interview-progress-fill');
        
        if (this.state.selectedRole) {
            const total = this.getCurrentQuestions().length;
            const current = this.state.currentQuestionIndex + 1;
            
            if (currentQuestionElement) currentQuestionElement.textContent = current;
            if (totalQuestionsElement) totalQuestionsElement.textContent = total;
            if (progressFill) {
                progressFill.style.width = (current / total * 100) + '%';
            }
        }
    }

    // Update current question display
    updateCurrentQuestion(text) {
        const questionElement = document.getElementById('current-question-text');
        if (questionElement) {
            if (text) {
                questionElement.textContent = text;
            } else if (this.state.selectedRole && this.state.currentQuestionIndex < this.getCurrentQuestions().length) {
                const questions = this.getCurrentQuestions();
                questionElement.textContent = questions[this.state.currentQuestionIndex];
            }
        }
    }

    // Set avatar state
    setAvatarState(state) {
        this.state.avatarState = state;
        
        const avatarBall = document.getElementById('avatar-ball');
        const avatarStatus = document.getElementById('avatar-status');
        
        if (avatarBall) {
            avatarBall.className = 'avatar-ball';
            if (state !== 'ready') {
                avatarBall.classList.add(state);
            }
        }
        
        if (avatarStatus) {
            switch (state) {
                case 'ready':
                    avatarStatus.textContent = 'Ready for interview';
                    break;
                case 'listening':
                    avatarStatus.textContent = 'Listening...';
                    break;
                case 'speaking':
                    avatarStatus.textContent = 'AI is speaking...';
                    break;
            }
        }
    }

    // Get current role questions
    getCurrentQuestions() {
        return this.state.selectedRole ? this.state.selectedRole.questions : [];
    }

    // Show screen
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.state.currentScreen = screenId;
            console.log('Showed screen:', screenId);
        }
    }

    // Show error
    showError(message) {
        const errorToast = document.getElementById('error-toast');
        const errorMessage = document.getElementById('error-message');
        
        if (errorMessage) errorMessage.textContent = message;
        if (errorToast) errorToast.classList.remove('hidden');
        
        console.log('Error:', message);
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideError(), 5000);
    }

    // Hide error
    hideError() {
        const errorToast = document.getElementById('error-toast');
        if (errorToast) errorToast.classList.add('hidden');
    }

    // Reset app
    resetApp() {
        this.clearTimers();
        
        this.state = {
            currentScreen: 'role-selection',
            selectedRole: null,
            uploadedFile: null,
            interviewActive: false,
            currentQuestionIndex: 0,
            interviewStartTime: null,
            interviewDuration: 0,
            avatarState: 'ready',
            isMuted: false
        };
        
        // Reset UI elements
        document.querySelectorAll('.role-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        this.removeFile();
        this.showScreen('role-selection');
        
        console.log('App reset');
    }

    // Clear all timers
    clearTimers() {
        Object.values(this.timers).forEach(timer => {
            if (timer) {
                clearTimeout(timer);
                clearInterval(timer);
            }
        });
        
        this.timers = {
            interview: null,
            avatar: null,
            setup: null
        };
    }

    // Utility functions
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aiviaApp = new AIVIAApp();
});

// Handle page visibility changes to pause/resume timers
document.addEventListener('visibilitychange', () => {
    if (window.aiviaApp && document.hidden && window.aiviaApp.state.interviewActive) {
        console.log('Page hidden, interview still active');
    }
});