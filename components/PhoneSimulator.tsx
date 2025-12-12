import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PhoneState, PhantomConfig } from '../types';
import { 
  Lock, Fingerprint, Power, RefreshCcw, AlertTriangle, Delete, 
  Settings, ChevronRight, Shield, Smartphone, Wifi, 
  Moon, Bell, ShieldCheck, ToggleLeft, ToggleRight, ArrowLeft, CheckCircle2, User, Mail, KeyRound, Bluetooth, Terminal, Grid, Phone
} from 'lucide-react';

interface PhoneSimulatorProps {
  currentState: PhoneState;
  setPhoneState: (state: PhoneState) => void;
  onSpyTriggered: (reason?: string, evidence?: string) => void;
  onAudioCaptured?: (audio: string) => void;
  phantomConfig: PhantomConfig;
  setPhantomConfig: React.Dispatch<React.SetStateAction<PhantomConfig>>;
  remoteCommand?: string | null;
}

const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({ 
    currentState, 
    setPhoneState, 
    onSpyTriggered,
    onAudioCaptured,
    phantomConfig,
    setPhantomConfig,
    remoteCommand
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [pinInput, setPinInput] = useState('');
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isAuthShake, setIsAuthShake] = useState(false);
  const [authStatusText, setAuthStatusText] = useState("Security Verification");
  const [attempts, setAttempts] = useState(0);
  const [cancelAttempts, setCancelAttempts] = useState(0);
  const [authIntent, setAuthIntent] = useState<'SHUTDOWN' | 'CANCEL'>('SHUTDOWN');
  
  // Power Button Logic
  const [isHoldingPower, setIsHoldingPower] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  // Spy Mode Wakeup Logic
  const spyWakeupTimerRef = useRef<any>(null);
  const [showSpyUnlock, setShowSpyUnlock] = useState(false);
  const [spyUnlockPin, setSpyUnlockPin] = useState('');

  // Camera & Flash Logic
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Wizard State
  const [wizardStep, setWizardStep] = useState(0); // 0=hidden, 1=email, 2=contact, 3=pin
  const [wizardData, setWizardData] = useState({
      email: '',
      contact: '',
      pin: ''
  });

  // Track previous state to return to after Power Menu
  const previousStateRef = useRef<PhoneState>(PhoneState.LOCKED);

  const CORRECT_PIN = '1234'; // Screen Lock PIN (Simulated)
  const MAX_ATTEMPTS = 2;

  // Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize Camera & Mic
  useEffect(() => {
    const startCamera = async () => {
        try {
            // Request both video and audio
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            console.error("Camera/Mic access denied:", err);
            setCameraActive(false);
        }
    };
    startCamera();
    
    return () => {
        // Stop tracks on unmount to release hardware
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // Capture Function (Image)
  const captureEvidence = useCallback(() => {
    try {
        if (videoRef.current && canvasRef.current && cameraActive) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context && video.videoWidth > 0) {
                // Set canvas dimensions to match video
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                // Convert to data URL
                return canvas.toDataURL('image/png');
            }
        }
    } catch (e) {
        console.error("Capture failed:", e);
    }
    return undefined;
  }, [cameraActive]);

  // Helper to Stop Recording
  const stopAudioRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
  }, []);

  // Record Function (Audio)
  const startAudioRecording = useCallback(() => {
      if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          // Check if audio track exists
          if (stream.getAudioTracks().length > 0) {
              try {
                  const recorder = new MediaRecorder(stream);
                  mediaRecorderRef.current = recorder;
                  audioChunksRef.current = [];

                  recorder.ondataavailable = (event) => {
                      if (event.data.size > 0) {
                          audioChunksRef.current.push(event.data);
                      }
                  };

                  recorder.onstop = () => {
                      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                      const reader = new FileReader();
                      reader.readAsDataURL(audioBlob);
                      reader.onloadend = () => {
                          if (onAudioCaptured && reader.result) {
                              onAudioCaptured(reader.result as string);
                          }
                      };
                  };

                  recorder.start();
                  // Stop automatically after 30 seconds
                  setTimeout(() => {
                      if (recorder.state === 'recording') {
                          recorder.stop();
                      }
                  }, 30000);
                  
              } catch (e) {
                  console.error("Failed to start audio recording", e);
              }
          }
      }
  }, [onAudioCaptured]);

  // Handle Remote Commands
  useEffect(() => {
      if (remoteCommand === 'RECORD_AUDIO') {
          startAudioRecording();
      }
  }, [remoteCommand, startAudioRecording]);

  // Flash Effect
  const triggerFlash = () => {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 200);
  };

  // Reset local state when entering Trap
  useEffect(() => {
    if (currentState === PhoneState.AUTH_TRAP) {
        setPinInput('');
        setAuthStatusText("Security Verification");
        setAuthIntent('SHUTDOWN'); 
        setIsAuthShake(false);
        setAttempts(0); 
        setCancelAttempts(0);
    }
  }, [currentState]);

  // Clean up timers
  useEffect(() => {
      return () => {
          if (spyWakeupTimerRef.current) clearTimeout(spyWakeupTimerRef.current);
      };
  }, []);

  // --- POWER BUTTON LOGIC ---
  const handlePowerMenuTrigger = useCallback(() => {
    if (currentState === PhoneState.POWER_MENU) {
      // Dismiss menu, return to previous state
      setPhoneState(previousStateRef.current);
    } else if (
        currentState !== PhoneState.FAKE_SHUTDOWN && 
        currentState !== PhoneState.REAL_SHUTDOWN && 
        currentState !== PhoneState.AUTH_TRAP &&
        currentState !== PhoneState.HARD_LOCKED
    ) {
      // Store current state and open menu
      previousStateRef.current = currentState;
      setPhoneState(PhoneState.POWER_MENU);
    }
  }, [currentState, setPhoneState]);

  // Hold Timer Logic
  useEffect(() => {
    let interval: any;
    if (isHoldingPower) {
        interval = setInterval(() => {
            setHoldProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsHoldingPower(false);
                    handlePowerMenuTrigger();
                    return 0;
                }
                return prev + 4; // Approx 800ms to fill
            });
        }, 30);
    } else {
        setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHoldingPower, handlePowerMenuTrigger]);

  const startHold = () => setIsHoldingPower(true);
  
  const stopHold = () => {
      setIsHoldingPower(false);
      // Optional: If held briefly but released before 100%, trigger anyway (Tap behavior)
      if (holdProgress > 10 && holdProgress < 100) {
          handlePowerMenuTrigger();
      }
      setHoldProgress(0);
  };

  // Global mouse up handler to catch drags off the button
  useEffect(() => {
      const handleGlobalMouseUp = () => {
          if (isHoldingPower) stopHold();
      };
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isHoldingPower]);


  const handlePowerOffSelection = () => {
    if (phantomConfig.enabled) {
      setPhoneState(PhoneState.AUTH_TRAP);
    } else {
      // Normal behavior if disabled
      setPhoneState(PhoneState.REAL_SHUTDOWN);
    }
  };

  // --- SPY MODE WAKEUP LOGIC ---
  const handleSpyModeStartHold = () => {
    if (showSpyUnlock) return;
    // Clear any existing timer just in case
    if (spyWakeupTimerRef.current) clearTimeout(spyWakeupTimerRef.current);
    
    spyWakeupTimerRef.current = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate([50, 50, 200]);
        setShowSpyUnlock(true);
        spyWakeupTimerRef.current = null;
    }, 10000); // 10 seconds hold required
  };

  const handleSpyModeEndHold = () => {
    if (spyWakeupTimerRef.current) {
        clearTimeout(spyWakeupTimerRef.current);
        spyWakeupTimerRef.current = null;
    }
  };

  const handleSpyUnlock = (pin: string) => {
      if (pin === phantomConfig.masterPin) {
          if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
          setPhoneState(PhoneState.HOME);
          setShowSpyUnlock(false);
          setSpyUnlockPin('');
      } else {
          if (navigator.vibrate) navigator.vibrate(200);
          setSpyUnlockPin('');
      }
  };

  // --- DEBUG TOOLS ---
  const debugForceShutdown = () => {
      // Capture
      const evidence = captureEvidence();
      triggerFlash();
      startAudioRecording();
      
      // Forcefully trigger the spy sequence
      onSpyTriggered("Forced via Debug Console", evidence);
      setPhoneState(PhoneState.FAKE_SHUTDOWN);
  };

  const debugOpenMenu = () => {
      if (currentState !== PhoneState.POWER_MENU && currentState !== PhoneState.HARD_LOCKED) {
        previousStateRef.current = currentState;
        setPhoneState(PhoneState.POWER_MENU);
      }
  };

  // --- WIZARD LOGIC ---
  const togglePhantomProtection = () => {
      if (!phantomConfig.enabled && !phantomConfig.isConfigured) {
          // Start Wizard
          setWizardStep(1);
      } else {
          // Just toggle
          setPhantomConfig(prev => ({ ...prev, enabled: !prev.enabled }));
      }
  };

  const handleWizardNext = () => {
      if (wizardStep === 1 && wizardData.email) setWizardStep(2);
      else if (wizardStep === 2 && wizardData.contact) setWizardStep(3);
      else if (wizardStep === 3 && wizardData.pin.length === 6) {
          // Save and Finish
          setPhantomConfig(prev => ({
              ...prev,
              enabled: true,
              isConfigured: true,
              recoveryEmail: wizardData.email,
              emergencyContact: wizardData.contact,
              masterPin: wizardData.pin
          }));
          setWizardStep(0);
      }
  };

  // --- TRAP LOGIC ---
  const handleTrapTrigger = useCallback((reason: string = "Unauthorized power-off attempt detected") => {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setIsAuthShake(true);
    setAuthStatusText("System Locked");
    setPinInput('');
    
    // SEQUENCE UPDATE: Shake -> Spinner -> Capture -> FLASH -> Audio -> Black Screen
    
    setTimeout(() => {
       setIsAuthShake(false);
       setIsShuttingDown(true); // Show "Shutting Down" spinner
       
       // DELAYED CAPTURE: Wait 1.8s (right before the 2s mark)
       setTimeout(() => {
           // 1. Capture Frame (Before flash to avoid white screen)
           const evidence = captureEvidence();
           
           // 2. Trigger Flash
           triggerFlash(); 
           
           // 3. Start Audio (30s)
           startAudioRecording(); 
           
           // 4. Send Data
           onSpyTriggered(reason, evidence); 
           
           // 5. Fake Shutdown
           setTimeout(() => {
               setIsShuttingDown(false);
               setPhoneState(PhoneState.FAKE_SHUTDOWN);
           }, 200);
           
       }, 1800);
       
    }, 1000);
  }, [onSpyTriggered, setPhoneState, captureEvidence, startAudioRecording]);

  const handleWarning = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(200);
    setIsAuthShake(true);
    setAuthStatusText("Incorrect PIN. Try Again.");
    setPinInput('');
    setTimeout(() => {
        setIsAuthShake(false);
        setAuthStatusText("Security Verification");
    }, 1000);
  }, []);

  const handleOwnerTrigger = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(50);
    stopAudioRecording(); // Stop recording if owner verifies
    setAuthStatusText("Verified");
    setTimeout(() => {
        setIsShuttingDown(true);
        setTimeout(() => {
          setIsShuttingDown(false);
          setPhoneState(PhoneState.REAL_SHUTDOWN);
        }, 2000);
    }, 300);
  }, [setPhoneState, stopAudioRecording]);

  const handleSecureCancel = () => {
      // STRICT: Must use Screen Lock PIN (1234) to Cancel
      if (pinInput === CORRECT_PIN) {
          if (navigator.vibrate) navigator.vibrate(50);
          setPhoneState(previousStateRef.current);
          setCancelAttempts(0);
          return;
      }
      const newCancelAttempts = cancelAttempts + 1;
      setCancelAttempts(newCancelAttempts);
      if (newCancelAttempts >= 2) {
          handleTrapTrigger("Suspicious Cancel Attempt Detected");
      } else {
          if (navigator.vibrate) navigator.vibrate(200);
          setIsAuthShake(true);
          setAuthStatusText("Enter PIN to Cancel");
          setAuthIntent('CANCEL');
          setTimeout(() => setIsAuthShake(false), 1000);
      }
  };

  const validatePin = (finalPin: string) => {
      // NOTE: Using 1234 (Screen Lock) for Auth Trap
      if (finalPin === CORRECT_PIN) {
          if (authIntent === 'CANCEL') {
              if (navigator.vibrate) navigator.vibrate(50);
              stopAudioRecording(); // Safety check
              setPhoneState(previousStateRef.current);
          } else {
              handleOwnerTrigger();
          }
      } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          if (newAttempts >= MAX_ATTEMPTS) {
              handleTrapTrigger();
          } else {
              handleWarning();
          }
      }
  };

  const handlePinEntry = (num: string) => {
    if (isShuttingDown || isAuthShake) return;
    if (navigator.vibrate) navigator.vibrate(20);
    const newPin = pinInput + num;
    if (newPin.length <= 4) setPinInput(newPin);
    if (newPin.length === 4) setTimeout(() => validatePin(newPin), 300);
  };

  const handleDelete = () => {
    if (pinInput.length > 0 && !isShuttingDown && !isAuthShake) {
        if (navigator.vibrate) navigator.vibrate(20);
        setPinInput(pinInput.slice(0, -1));
    }
  };

  // --- RENDERERS ---

  const renderLockScreen = () => (
    <div 
      className="flex flex-col items-center justify-between h-full pt-16 pb-10 text-white animate-fade-in cursor-pointer select-none"
      onClick={() => {
        if (navigator.vibrate) navigator.vibrate(20);
        setPhoneState(PhoneState.HOME);
      }}
    >
      <div className="flex flex-col items-center">
        <div className="text-6xl font-thin tracking-tighter drop-shadow-lg">
          {currentTime.getHours()}:{currentTime.getMinutes().toString().padStart(2, '0')}
        </div>
        <div className="text-lg font-light mt-2 opacity-90 drop-shadow-md">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 animate-bounce-slow mb-8">
        <Lock className="w-8 h-8 opacity-80" />
        <p className="text-sm font-medium opacity-80 tracking-widest uppercase drop-shadow-md">Click to Unlock</p>
      </div>
    </div>
  );

  const renderHomeScreen = () => (
    <div className="h-full w-full flex flex-col p-6 animate-fade-in">
       {/* Status Bar Spacer */}
       <div className="h-6 w-full mb-8"></div>
       
       {/* Clock Widget */}
       <div className="mt-8 mb-auto">
         <div className="text-5xl font-thin text-white/90 drop-shadow-lg">
            {currentTime.getHours()}:{currentTime.getMinutes().toString().padStart(2, '0')}
         </div>
         <div className="text-white/80 text-sm mt-1 drop-shadow-md">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
         </div>
       </div>

       {/* App Grid */}
       <div className="grid grid-cols-4 gap-x-4 gap-y-6 mb-8">
          {/* Settings App - Functional */}
          <div 
            className="flex flex-col items-center gap-2 group cursor-pointer active:scale-90 transition-transform" 
            onClick={() => setPhoneState(PhoneState.SETTINGS_MAIN)}
          >
             <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-600 flex items-center justify-center shadow-lg">
                <Settings className="w-8 h-8 text-slate-200" />
             </div>
             <span className="text-[11px] text-white/90 font-medium drop-shadow-md">Settings</span>
          </div>

          {/* Dummy Apps */}
          {[
              { name: 'Chrome', color: 'bg-blue-500' }, 
              { name: 'Photos', color: 'bg-yellow-500' }, 
              { name: 'Camera', color: 'bg-red-500' },
              { name: 'Maps', color: 'bg-green-500' },
              { name: 'Gmail', color: 'bg-red-400' },
              { name: 'Play Store', color: 'bg-teal-500' },
              { name: 'YouTube', color: 'bg-red-600' }
          ].map((app, i) => (
             <div key={i} className="flex flex-col items-center gap-2 group opacity-90 active:scale-95 transition-transform cursor-pointer">
                <div className={`w-14 h-14 rounded-2xl ${app.color} shadow-lg flex items-center justify-center`}>
                    <div className="text-white font-bold text-lg">{app.name[0]}</div>
                </div>
                <span className="text-[11px] text-white/90 font-medium drop-shadow-md">{app.name}</span>
             </div>
          ))}
       </div>
    </div>
  );

  const SettingsHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-4 p-4 pb-2 border-b border-slate-800 bg-slate-950 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-900 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="text-lg font-medium text-white">{title}</h2>
    </div>
  );

  const SettingsItem = ({ icon: Icon, label, subLabel, onClick, hasChevron = true }: any) => (
    <div 
        onClick={onClick}
        className="flex items-center gap-4 p-4 hover:bg-slate-900 cursor-pointer active:bg-slate-800 transition-colors border-b border-slate-900/50"
    >
        {Icon && <Icon className="w-6 h-6 text-slate-400" />}
        <div className="flex-1">
            <div className="text-sm font-medium text-slate-200">{label}</div>
            {subLabel && <div className="text-xs text-slate-500 mt-0.5">{subLabel}</div>}
        </div>
        {hasChevron && <ChevronRight className="w-4 h-4 text-slate-600" />}
    </div>
  );

  const renderSettingsMain = () => (
    <div className="h-full bg-slate-950 flex flex-col animate-slide-in-right">
       <div className="h-8"></div>
       <div className="px-6 pb-4 pt-8">
           <h1 className="text-2xl text-white font-light mb-1">Settings</h1>
           <div className="flex items-center gap-2 p-3 bg-slate-900 rounded-lg border border-slate-800 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">J</div>
                <div className="flex-1">
                    <div className="text-sm text-white">John Doe</div>
                    <div className="text-xs text-slate-500">Google Account</div>
                </div>
           </div>
       </div>

       <div className="flex-1 overflow-y-auto">
            <SettingsItem icon={Wifi} label="Network & internet" subLabel="Wi-Fi, Mobile, Data usage" />
            <SettingsItem icon={Smartphone} label="Connected devices" subLabel="Bluetooth, Pairing" />
            <SettingsItem icon={Moon} label="Display" subLabel="Dark mode, font size" />
            <SettingsItem icon={Bell} label="Notifications" subLabel="App settings" />
            <SettingsItem 
                icon={ShieldCheck} 
                label="Security & privacy" 
                subLabel="Lock screen, Phantom Protection" 
                onClick={() => setPhoneState(PhoneState.SETTINGS_SECURITY)}
            />
       </div>
    </div>
  );

  const renderSettingsSecurity = () => (
    <div className="h-full bg-slate-950 flex flex-col animate-slide-in-right">
       <div className="h-8"></div>
       <SettingsHeader title="Security & privacy" onBack={() => setPhoneState(PhoneState.SETTINGS_MAIN)} />
       
       <div className="flex-1 overflow-y-auto">
           <div className="p-4">
                <div className="bg-green-900/20 border border-green-800/50 rounded-lg p-4 flex items-center gap-3 mb-2">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                    <div>
                        <div className="text-sm font-medium text-green-400">System is secure</div>
                        <div className="text-xs text-green-500/60">Updated 2 mins ago</div>
                    </div>
                </div>
           </div>
           <div className="h-2 bg-black/20"></div>
           <SettingsItem label="Device lock" subLabel="Screen lock, Face Unlock" />
           <SettingsItem 
                icon={Shield} 
                label="Phantom Theft Protection" 
                subLabel={phantomConfig.enabled ? "On • High Sensitivity" : "Off"}
                onClick={() => setPhoneState(PhoneState.SETTINGS_PHANTOM)}
           />
       </div>
    </div>
  );

  const renderSetupWizard = () => (
    <div className="absolute inset-0 bg-slate-900 z-50 flex flex-col animate-fade-in p-6 pt-12">
        <h2 className="text-xl font-light text-white mb-2">Phantom Setup</h2>
        <div className="flex gap-2 mb-8">
            {[1,2,3].map(step => (
                <div key={step} className={`h-1 flex-1 rounded-full ${wizardStep >= step ? 'bg-cyan-500' : 'bg-slate-700'}`} />
            ))}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-4">
            {wizardStep === 1 && (
                <div className="animate-slide-in-right">
                    <Mail className="w-12 h-12 text-cyan-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">Recovery Email</h3>
                    <p className="text-slate-400 text-sm mb-6">Where should we send location updates?</p>
                    <input 
                        type="email" 
                        value={wizardData.email}
                        onChange={(e) => setWizardData({...wizardData, email: e.target.value})}
                        placeholder="your@email.com"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-white focus:border-cyan-500 outline-none transition-colors"
                        autoFocus
                    />
                </div>
            )}

            {wizardStep === 2 && (
                <div className="animate-slide-in-right">
                    <User className="w-12 h-12 text-cyan-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">Emergency Contact</h3>
                    <p className="text-slate-400 text-sm mb-6">Who should we notify if trap triggers?</p>
                    <input 
                        type="tel" 
                        value={wizardData.contact}
                        onChange={(e) => setWizardData({...wizardData, contact: e.target.value})}
                        placeholder="+1 (555) 000-0000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-white focus:border-cyan-500 outline-none transition-colors"
                        autoFocus
                    />
                </div>
            )}

            {wizardStep === 3 && (
                <div className="animate-slide-in-right">
                    <KeyRound className="w-12 h-12 text-cyan-400 mb-4" />
                    <h3 className="text-lg font-medium text-white mb-1">Create Master PIN</h3>
                    <p className="text-slate-400 text-sm mb-6">Set a 6-digit code for Web Access.</p>
                    <input 
                        type="text" 
                        maxLength={6}
                        value={wizardData.pin}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setWizardData({...wizardData, pin: val});
                        }}
                        placeholder="000000"
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-white text-center text-2xl tracking-[0.5em] focus:border-cyan-500 outline-none transition-colors"
                        autoFocus
                    />
                    <p className="text-xs text-slate-500 text-center mt-2">Do not forget this PIN.</p>
                </div>
            )}
        </div>

        <button 
            onClick={handleWizardNext}
            disabled={(wizardStep === 1 && !wizardData.email) || (wizardStep === 2 && !wizardData.contact) || (wizardStep === 3 && wizardData.pin.length < 6)}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-4 rounded-xl transition-all active:scale-[0.98]"
        >
            {wizardStep === 3 ? 'Activate Protection' : 'Next'}
        </button>
    </div>
  );

  const renderSettingsPhantom = () => (
      <div className="h-full bg-slate-950 flex flex-col animate-slide-in-right relative overflow-hidden">
        {wizardStep > 0 && renderSetupWizard()}
        
        <div className="h-8"></div>
        <SettingsHeader title="Phantom Protection" onBack={() => setPhoneState(PhoneState.SETTINGS_SECURITY)} />
        
        <div className="p-6 flex flex-col items-center border-b border-slate-900">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-500 ${phantomConfig.enabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
                <Shield className="w-8 h-8" />
            </div>
            <h3 className="text-white font-medium text-lg">Anti-Theft System</h3>
            <p className="text-slate-500 text-xs text-center mt-1 px-4">
                Triggers a simulated shutdown interface when unauthorized users attempt to power off the device.
            </p>
        </div>

        <div className="p-4">
            <div 
                onClick={togglePhantomProtection}
                className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-800 active:scale-[0.98] transition-all cursor-pointer"
            >
                <span className="font-medium text-white">Use Phantom Protection</span>
                {phantomConfig.enabled ? (
                    <ToggleRight className="w-8 h-8 text-cyan-400" />
                ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
            </div>
        </div>

        {phantomConfig.enabled && (
            <div className="px-4 space-y-2 animate-fade-in-up">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2 mt-4 mb-2">Configuration</div>
                
                <div className="flex items-center gap-3 p-4 border-b border-slate-900/50">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                        <div className="text-sm font-medium text-slate-200">Account Active</div>
                        <div className="text-xs text-slate-500">{phantomConfig.recoveryEmail}</div>
                    </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border-b border-slate-900/50">
                    <div>
                        <div className="text-sm font-medium text-slate-200">Fake Shutdown</div>
                        <div className="text-xs text-slate-500">Simulate screen death</div>
                    </div>
                    <ToggleRight className="w-6 h-6 text-cyan-400 opacity-80" />
                </div>

                <div className="flex items-center justify-between p-4 border-b border-slate-900/50">
                    <div>
                        <div className="text-sm font-medium text-slate-200">Sensitivity</div>
                        <div className="text-xs text-slate-500">Trigger on 2 failed attempts</div>
                    </div>
                    <span className="text-xs text-cyan-400 font-mono bg-cyan-950 px-2 py-1 rounded">HIGH</span>
                </div>

                {/* New Hardware Security Section */}
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-2 mt-6 mb-2">Hardware Security</div>
                
                <div 
                    onClick={() => setPhantomConfig(prev => ({ ...prev, bleBeacon: !prev.bleBeacon }))}
                    className="flex items-center justify-between p-4 border-b border-slate-900/50 cursor-pointer active:bg-slate-900/50 transition-colors rounded-lg"
                >
                    <div>
                        <div className="text-sm font-medium text-slate-200 flex items-center gap-2">
                             <Bluetooth className="w-4 h-4 text-blue-400" /> Powered-Off Finding (BLE)
                        </div>
                        <div className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                            Allows device to be tracked via the Find My Device network for up to 72 hours after shutdown using reserve battery.
                        </div>
                    </div>
                    {phantomConfig.bleBeacon ? (
                         <ToggleRight className="w-6 h-6 text-cyan-400 opacity-80" />
                    ) : (
                         <ToggleLeft className="w-6 h-6 text-slate-600" />
                    )}
                </div>
            </div>
        )}
      </div>
  );

  const renderPowerMenu = () => (
    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
      <div className="flex flex-col gap-6 w-3/4">
        <button 
          onClick={handlePowerOffSelection}
          className="flex flex-col items-center gap-2 p-6 bg-white/10 rounded-2xl hover:bg-red-500/20 active:scale-95 transition-all border border-white/5 shadow-2xl"
        >
          <Power className="w-8 h-8 text-red-400" />
          <span className="text-sm font-medium text-white">Power Off</span>
        </button>
        
        <button className="flex flex-col items-center gap-2 p-6 bg-white/10 rounded-2xl opacity-50 cursor-not-allowed border border-white/5">
          <RefreshCcw className="w-8 h-8 text-white" />
          <span className="text-sm font-medium text-white">Restart</span>
        </button>

        <button className="flex flex-col items-center gap-2 p-6 bg-white/10 rounded-2xl opacity-50 cursor-not-allowed border border-white/5">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <span className="text-sm font-medium text-white">Emergency</span>
        </button>
      </div>
      
      {/* Tap outside to dismiss */}
      <div 
        className="absolute inset-0 -z-10" 
        onClick={() => setPhoneState(previousStateRef.current)} 
      />
    </div>
  );

  const renderAuthTrap = () => (
    <div className="absolute inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col items-center pt-16 animate-slide-up">
      <h2 className={`text-xl font-medium mb-4 transition-colors duration-300 ${isAuthShake ? 'text-red-500 font-bold' : 'text-white'}`}>
        {authStatusText}
      </h2>

      <div className={`flex gap-4 mb-8 h-4 ${isAuthShake ? 'animate-shake' : ''}`}>
        {[0, 1, 2, 3].map((index) => (
            <div 
                key={index}
                className={`w-3 h-3 rounded-full border transition-all duration-200 ${
                    index < pinInput.length 
                    ? 'bg-white border-white scale-110' 
                    : 'bg-transparent border-slate-500'
                } ${isAuthShake ? 'bg-red-500 border-red-500' : ''}`}
            />
        ))}
      </div>
      
      <div 
        onClick={() => handleTrapTrigger("Biometric mismatch")}
        className={`mb-6 relative group cursor-pointer ${isAuthShake ? 'animate-shake' : ''}`}
      >
        <div className={`absolute inset-0 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${isAuthShake ? 'bg-red-500/50 opacity-100' : 'bg-cyan-500/30'}`} />
        <Fingerprint className={`w-16 h-16 transition-colors duration-300 ${isAuthShake ? 'text-red-500' : 'text-cyan-400 animate-pulse'}`} />
        <p className={`mt-2 text-xs text-center transition-colors ${isAuthShake ? 'text-red-400' : 'text-cyan-200/50'}`}>
            {isAuthShake ? 'Not Recognized' : 'Touch ID'}
        </p>
      </div>

      <div className={`grid grid-cols-3 gap-x-6 gap-y-4 w-3/4 max-w-[280px] ${isAuthShake ? 'opacity-50 pointer-events-none' : ''}`}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handlePinEntry(num.toString())}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-2xl font-light transition-all active:scale-95"
          >
            {num}
          </button>
        ))}
        
        <div className="flex items-center justify-center"></div>
        <button
            onClick={() => handlePinEntry("0")}
            className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/20 active:bg-white/30 flex items-center justify-center text-2xl font-light transition-all active:scale-95"
        >
            0
        </button>
        <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors active:scale-95"
        >
            <Delete className="w-6 h-6" />
        </button>
      </div>

      <button 
        onClick={handleSecureCancel}
        className="mt-8 text-[10px] font-medium tracking-widest text-slate-500 hover:text-slate-300 uppercase transition-colors px-4 py-2"
      >
        CANCEL
      </button>
    </div>
  );

  const renderShuttingDown = () => (
    <div className="absolute inset-0 bg-black z-[60] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-400 text-sm tracking-wider">Shutting down...</p>
    </div>
  );

  const renderHardLocked = () => (
    <div className="absolute inset-0 bg-red-600 z-[100] flex flex-col items-center justify-center p-8 text-center animate-pulse">
        <div className="bg-white/20 p-6 rounded-full mb-8">
            <AlertTriangle className="w-20 h-20 text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">System Disabled</h1>
        <p className="text-white/80 font-mono text-sm mb-12">This device has been remotely locked by the owner.</p>
        
        <div className="w-full bg-black/20 rounded-xl p-6 backdrop-blur-sm border border-white/10 space-y-4">
            <div>
                <div className="text-[10px] text-white/60 uppercase tracking-widest mb-1">Return To</div>
                <div className="text-white font-bold text-lg">{phantomConfig.recoveryEmail || 'Owner'}</div>
            </div>
            <div>
                 <div className="text-[10px] text-white/60 uppercase tracking-widest mb-1">Emergency Contact</div>
                 <div className="text-white font-bold text-lg">{phantomConfig.emergencyContact || 'Not Set'}</div>
            </div>
        </div>
        
        <div className="absolute bottom-8 text-white/40 text-[10px] uppercase tracking-[0.2em]">
            Phantom Security Protocol
        </div>
    </div>
  );

  const renderSpyMode = () => (
    <div 
      className="absolute inset-0 bg-black z-40 flex flex-col justify-end p-6 overflow-hidden select-none cursor-default"
      onMouseDown={handleSpyModeStartHold}
      onMouseUp={handleSpyModeEndHold}
      onMouseLeave={handleSpyModeEndHold}
      onTouchStart={handleSpyModeStartHold}
      onTouchEnd={handleSpyModeEndHold}
    >
      <div className={`font-mono text-[10px] text-green-500/40 space-y-1 transition-opacity duration-500 pointer-events-none ${showSpyUnlock ? 'opacity-0' : 'opacity-100'}`}>
         <p>{`> status: "Spy Mode Active"`}</p>
         <p>{`> event: "Intruder Selfie Captured"`}</p>
         <p>{`> location: "Lat: 22.57, Long: 88.36"`}</p>
         <p>{`> upload: "Evidence uploading..."`}</p>
         <p className={`${remoteCommand === 'RECORD_AUDIO' ? 'text-red-400 animate-pulse font-bold' : ''}`}>
             {`> audio_rec: "${remoteCommand === 'RECORD_AUDIO' ? 'REMOTE RECORDING...' : 'Monitoring'}"`}
         </p>
      </div>

      {showSpyUnlock && (
        <div 
          className="absolute inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center animate-fade-in"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
             <div className="mb-6 flex flex-col items-center">
                <ShieldCheck className="w-12 h-12 text-slate-700 mb-2" />
                <h3 className="text-slate-500 text-xs font-mono uppercase tracking-widest">System Override</h3>
             </div>

             {/* PIN Circles */}
             <div className="flex gap-4 mb-8">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className={`w-3 h-3 rounded-full border border-slate-700 ${i < spyUnlockPin.length ? 'bg-slate-500' : ''}`} />
                ))}
             </div>

             {/* Numpad */}
             <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                   <button
                     key={num}
                     onClick={() => {
                         const newPin = spyUnlockPin + num;
                         if (newPin.length <= 6) setSpyUnlockPin(newPin);
                         if (newPin.length === 6) handleSpyUnlock(newPin);
                     }}
                     className={`w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xl font-light hover:bg-slate-800 active:bg-slate-700 transition-colors ${num === 0 ? 'col-start-2' : ''}`}
                   >
                     {num}
                   </button>
                ))}
             </div>
             
             <button 
                onClick={() => {
                    setShowSpyUnlock(false);
                    setSpyUnlockPin('');
                }}
                className="mt-8 text-xs text-slate-600 uppercase tracking-widest hover:text-slate-400"
             >
                Cancel Override
             </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center">
          <div className="relative group">
            {/* PHYSICAL DEVICE FRAME */}
            <div className="relative w-[340px] h-[700px] bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/10 select-none">
              
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-30 flex items-center justify-center gap-3">
                <div className="w-12 h-2 rounded-full bg-slate-900 border border-slate-800" />
                <div className="w-2 h-2 rounded-full bg-blue-900/50" />
              </div>

              {/* PHYSICAL BUTTONS */}
              
              {/* Power Button Wrapper with enlarged hit area */}
              <div className="absolute -right-[24px] top-28 h-28 w-12 flex items-center justify-center z-50">
                  <button 
                      onMouseDown={startHold}
                      onMouseUp={stopHold}
                      onTouchStart={startHold}
                      onTouchEnd={stopHold}
                      onMouseLeave={stopHold}
                      className={`w-[12px] h-20 rounded-r-md border-l border-slate-950 transition-all duration-100 shadow-lg relative right-3 ${isHoldingPower ? 'bg-cyan-600 scale-95 translate-x-[-2px]' : 'bg-slate-800'}`}
                      title="Power Button (Hold to activate)"
                      aria-label="Power Button"
                  />
              </div>

              {/* Volume Buttons */}
              <div className="absolute -left-[12px] top-32 w-[12px] h-28 bg-slate-800 rounded-l-md border-r border-slate-950 z-0" />

              {/* SCREEN CONTENT */}
              <div 
                className="w-full h-full bg-cover bg-center transition-all duration-500 bg-black relative"
                style={{ 
                  backgroundColor: '#0f172a', /* Fallback color to prevent blank screen */
                  backgroundImage: 
                      (currentState === PhoneState.HOME || currentState === PhoneState.LOCKED) 
                      ? 'url("https://picsum.photos/400/800?grayscale&blur=2")' 
                      : 'none'
                }}
              >
                {/* WEBCAM & CANVAS (HIDDEN BUT WARMED UP) */}
                {/* Changed to absolute opacity-0 to ensure browser renders frames without visible display */}
                <video ref={videoRef} autoPlay playsInline muted className="absolute opacity-0 -z-50 pointer-events-none" />
                <canvas ref={canvasRef} className="hidden pointer-events-none" />
                
                {/* FLASH OVERLAY - Higher z-index than almost anything */}
                {isFlashing && (
                    <div className="absolute inset-0 bg-white z-[200] animate-pulse pointer-events-none" />
                )}

                {currentState === PhoneState.LOCKED && renderLockScreen()}
                {currentState === PhoneState.HOME && renderHomeScreen()}
                {currentState === PhoneState.SETTINGS_MAIN && renderSettingsMain()}
                {currentState === PhoneState.SETTINGS_SECURITY && renderSettingsSecurity()}
                {currentState === PhoneState.SETTINGS_PHANTOM && renderSettingsPhantom()}
                {currentState === PhoneState.POWER_MENU && renderPowerMenu()}
                {currentState === PhoneState.AUTH_TRAP && renderAuthTrap()}
                {isShuttingDown && renderShuttingDown()}
                {currentState === PhoneState.FAKE_SHUTDOWN && renderSpyMode()}
                {currentState === PhoneState.HARD_LOCKED && renderHardLocked()}
                
                {/* Visual Hold Progress Overlay */}
                {isHoldingPower && (
                  <div className="absolute inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in">
                      <div className="flex flex-col items-center gap-2">
                          <div className="w-16 h-16 rounded-full border-4 border-white/20 relative flex items-center justify-center">
                              <svg className="w-full h-full -rotate-90 absolute">
                                  <circle 
                                      cx="32" cy="32" r="28" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="4"
                                      className="text-cyan-500 transition-all duration-75"
                                      strokeDasharray="176"
                                      strokeDashoffset={176 - (176 * holdProgress) / 100}
                                      strokeLinecap="round"
                                  />
                              </svg>
                              <Power className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-white font-medium text-sm tracking-widest">HOLDING...</span>
                      </div>
                  </div>
                )}

              </div>
            </div>
          </div>
      </div>

      {/* FIXED DEBUG FOOTER - MOVED OUTSIDE PHONE FRAME */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-[100] flex justify-center shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
         <div className="flex items-center gap-4 max-w-2xl w-full justify-between">
            <div className="flex items-center gap-2 px-4 border-r border-slate-800">
                <Terminal className="w-5 h-5 text-slate-500" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Developer Tools</span>
                  <span className="text-xs text-slate-400">Testing Controls</span>
                </div>
            </div>
            
            <div className="flex gap-3">
              <button
                  onClick={debugForceShutdown}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-lg text-xs font-mono transition-colors active:scale-95 whitespace-nowrap"
              >
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  FORCE SPY MODE
              </button>
              
              <button
                  onClick={debugOpenMenu}
                  className="flex items-center gap-2 px-4 py-2 bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-900/50 rounded-lg text-xs font-mono transition-colors active:scale-95 whitespace-nowrap"
              >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  SIMULATE BUTTON HOLD
              </button>
            </div>
         </div>
      </div>
    </>
  );
};

export default PhoneSimulator;