import React, { useState, useEffect } from 'react';
import PhoneSimulator from './components/PhoneSimulator';
import CommandCenter from './components/CommandCenter';
import { PhoneState, SecurityLog, PhantomConfig } from './types';
import { Smartphone, Monitor, ShieldCheck } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'phone' | 'web'>('phone');
  const [phoneState, setPhoneState] = useState<PhoneState>(PhoneState.LOCKED);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [capturedEvidence, setCapturedEvidence] = useState<string | null>(null);
  const [capturedAudio, setCapturedAudio] = useState<string | null>(null);
  
  // Remote Command State
  const [isRemoteRecording, setIsRemoteRecording] = useState(false);
  const [remoteCommand, setRemoteCommand] = useState<string | null>(null);
  
  // Shared Configuration State (The Ecosystem Core)
  const [phantomConfig, setPhantomConfig] = useState<PhantomConfig>({
    enabled: false,
    fakeShutdown: true,
    sensitivity: 'High',
    recoveryEmail: '',
    emergencyContact: '',
    masterPin: '',
    isConfigured: false,
    bleBeacon: true // Default enabled for demo purposes
  });

  // Sound effect helper (simulated)
  const playSound = (type: 'alert' | 'click') => {
    console.log(`Playing sound: ${type}`);
  };

  const addLog = (event: string, details: string, type: 'info' | 'alert' | 'danger') => {
    const newLog: SecurityLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      event,
      details,
      type,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const handleSpyTrigger = (reason: string = 'Unauthorized power-off attempt detected', evidence?: string) => {
    playSound('alert');
    addLog('SECURITY BREACH', reason, 'danger');
    
    if (evidence) {
        setCapturedEvidence(evidence);
    }
    
    // Simulate delay for data capture
    setTimeout(() => {
        addLog('BIOMETRIC FAIL', 'Fingerprint mismatch recorded', 'alert');
    }, 500);
    
    setTimeout(() => {
        addLog('CAMERA ACTIVE', 'Front camera triggered silently', 'danger');
    }, 1200);

    setTimeout(() => {
        addLog('LOCATION LOCKED', 'GPS Coordinates: 22.57, 88.36', 'info');
    }, 2000);
  };

  const handleRemoteRecordRequest = () => {
    if (phoneState !== PhoneState.FAKE_SHUTDOWN) {
        addLog('COMMAND FAILED', 'Device must be in Spy Mode to record.', 'alert');
        return;
    }
    setIsRemoteRecording(true);
    setRemoteCommand('RECORD_AUDIO');
    addLog('REMOTE COMMAND', 'Initializing 30s Audio Surveillance...', 'info');
  };

  const handleAudioCaptured = (audioData: string) => {
      setCapturedAudio(audioData);
      
      if (isRemoteRecording) {
          addLog('AUDIO SECURED', 'Remote recording upload complete.', 'danger');
          setIsRemoteRecording(false);
          setRemoteCommand(null);
      } else {
          addLog('AUDIO SURVEILLANCE', 'Trap Audio Clip Secured', 'danger');
      }
  };

  const handleHardLock = () => {
      playSound('alert');
      setPhoneState(PhoneState.HARD_LOCKED);
      addLog('REMOTE LOCK', 'Hard Lock command executed. Device disabled.', 'danger');
  };

  // Log state changes
  useEffect(() => {
    if (phoneState === PhoneState.REAL_SHUTDOWN) {
        addLog('SYSTEM SHUTDOWN', 'Authorized owner shutdown initiated', 'info');
    }
  }, [phoneState]);

  const resetSystem = () => {
    setPhoneState(PhoneState.LOCKED);
    setLogs([]);
    setCapturedEvidence(null);
    setCapturedAudio(null);
    setPhantomConfig(prev => ({ ...prev, isConfigured: false, enabled: false }));
    setActiveTab('phone');
    setIsRemoteRecording(false);
    setRemoteCommand(null);
    addLog('SYSTEM RESET', 'Prototype reset to initial state', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-cyan-500/30">
      
      {/* Sticky Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">Phantom<span className="text-cyan-400">Lock</span></h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">System Prototype v1.0</p>
              </div>
            </div>

            <div className="flex bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
              <button
                onClick={() => setActiveTab('phone')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'phone' 
                    ? 'bg-slate-700 text-white shadow-md shadow-slate-900/50 ring-1 ring-white/10' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Phone Simulator
              </button>

              <button
                onClick={() => setActiveTab('web')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  activeTab === 'web' 
                    ? 'bg-red-900/80 text-white shadow-md shadow-red-900/20 ring-1 ring-red-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Command Center
              </button>
            </div>
            
            <div className="w-32 hidden md:block">
               {/* Spacer for balance */}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Ambient Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
           <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[128px] transition-opacity duration-1000 ${activeTab === 'web' ? 'opacity-0' : 'opacity-100'}`} />
           <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[128px] transition-opacity duration-1000 ${activeTab === 'phone' ? 'opacity-0' : 'opacity-100'}`} />
        </div>

        {activeTab === 'phone' ? (
           <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
              <div className="mb-8 text-center">
                 <h2 className="text-3xl font-light text-white mb-2">Target Device</h2>
                 <p className="text-slate-400 text-sm">Interact with the phone to simulate the theft scenario</p>
              </div>
              
              <PhoneSimulator 
                currentState={phoneState} 
                setPhoneState={setPhoneState} 
                onSpyTriggered={handleSpyTrigger}
                onAudioCaptured={handleAudioCaptured}
                phantomConfig={phantomConfig}
                setPhantomConfig={setPhantomConfig}
                remoteCommand={remoteCommand}
              />

              <div className="mt-8 text-center max-w-sm text-slate-500 text-sm bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 backdrop-blur">
                  {!phantomConfig.isConfigured ? (
                      <p>
                        <span className="block text-cyan-400 font-semibold mb-1">Setup Phase</span>
                        Unlock &rarr; Settings &rarr; Security &rarr; Phantom Protection.
                      </p>
                  ) : (
                      <p>
                        <span className="block text-red-400 font-semibold mb-1">Trap Armed</span>
                        Hold the Power Button and try to turn off the device to trigger the Fake Shutdown.
                      </p>
                  )}
              </div>
           </div>
        ) : (
           <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
               <div className="mb-8 text-center">
                 <h2 className="text-3xl font-light text-white mb-2">Surveillance Hub</h2>
                 <p className="text-slate-400 text-sm">Remote tracking and evidence collection portal</p>
               </div>
               
               <CommandCenter 
                    phoneState={phoneState} 
                    logs={logs} 
                    resetSystem={resetSystem}
                    phantomConfig={phantomConfig}
                    evidenceImage={capturedEvidence}
                    evidenceAudio={capturedAudio}
                    onHardLock={handleHardLock}
                    onRecordRequest={handleRemoteRecordRequest}
                    isRemoteRecording={isRemoteRecording}
                />
           </div>
        )}

      </main>
    </div>
  );
};

export default App;