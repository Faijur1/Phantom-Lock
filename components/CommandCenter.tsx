import React, { useState } from 'react';
import { PhoneState, SecurityLog, PhantomConfig } from '../types';
import { ShieldAlert, MapPin, Camera, Activity, Smartphone, Wifi, Lock, LogIn, AlertCircle, Bluetooth, AlertTriangle, Mic } from 'lucide-react';

interface CommandCenterProps {
  phoneState: PhoneState;
  logs: SecurityLog[];
  resetSystem: () => void;
  phantomConfig: PhantomConfig;
  evidenceImage: string | null;
  evidenceAudio: string | null;
  onHardLock: () => void;
  onRecordRequest: () => void;
  isRemoteRecording: boolean;
}

interface LoginScreenProps {
  email: string;
  setEmail: (email: string) => void;
  pin: string;
  setPin: (pin: string) => void;
  error: string;
  onLogin: (e: React.FormEvent) => void;
}

// Extracted LoginScreen component to prevent re-renders losing focus
const LoginScreen: React.FC<LoginScreenProps> = ({ email, setEmail, pin, setPin, error, onLogin }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-8">
      <div className="mb-8 flex flex-col items-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 ring-1 ring-red-500/20">
             <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">PHANTOM RECOVERY</h1>
          <p className="text-slate-500 text-sm mt-2 uppercase tracking-widest">Lost Device Portal</p>
      </div>

      <form onSubmit={onLogin} className="w-full max-w-sm flex flex-col gap-4">
          <div>
              <label className="text-xs text-slate-400 font-bold uppercase ml-1 mb-1 block">Registered Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors"
                placeholder="Enter email"
                autoFocus
              />
          </div>
          <div>
              <label className="text-xs text-slate-400 font-bold uppercase ml-1 mb-1 block">Master PIN</label>
              <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={6}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:border-red-500 outline-none transition-colors tracking-widest"
                placeholder="••••••"
              />
          </div>

          {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
              </div>
          )}

          <button 
            type="submit"
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mt-4 transition-all active:scale-[0.98] shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
          >
              <LogIn className="w-4 h-4" /> ACCESS SYSTEM
          </button>
      </form>
      
      <div className="mt-8 text-slate-600 text-xs text-center">
          <p>Secure Connection Enforced (TLS 1.3)</p>
          <p>Unauthorized access is a federal offense.</p>
      </div>
  </div>
);

const CommandCenter: React.FC<CommandCenterProps> = ({ 
    phoneState, 
    logs, 
    resetSystem, 
    phantomConfig, 
    evidenceImage, 
    evidenceAudio, 
    onHardLock,
    onRecordRequest,
    isRemoteRecording
}) => {
  const isSpyActive = phoneState === PhoneState.FAKE_SHUTDOWN;
  const isOnline = phoneState !== PhoneState.REAL_SHUTDOWN;
  const isHardLocked = phoneState === PhoneState.HARD_LOCKED;

  // Login State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');

      if (!phantomConfig.isConfigured) {
          setLoginError('No Phantom device registered.');
          return;
      }

      if (loginEmail === phantomConfig.recoveryEmail && loginPin === phantomConfig.masterPin) {
          setIsAuthenticated(true);
      } else {
          setLoginError('Invalid credentials. Access Denied.');
      }
  };

  if (!isAuthenticated) {
      return (
        <div className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[700px]">
             <LoginScreen 
                email={loginEmail}
                setEmail={setLoginEmail}
                pin={loginPin}
                setPin={setLoginPin}
                error={loginError}
                onLogin={handleLogin}
             />
        </div>
      );
  }

  return (
    <div className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isSpyActive ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-400'}`}>
                <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white tracking-wide">PHANTOM COMMAND CENTER</h1>
                <p className="text-xs text-slate-400 uppercase tracking-widest">Remote Surveillance Interface</p>
            </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-500 ${
                 isSpyActive && phantomConfig.bleBeacon
                    ? 'bg-blue-900/30 border-blue-500/50' 
                    : 'bg-slate-800 border-slate-700'
             }`}>
                {isSpyActive && phantomConfig.bleBeacon ? (
                    <>
                         <div className="relative">
                             <div className="w-2 h-2 rounded-full bg-blue-400 z-10 relative" />
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500/50 rounded-full animate-ping" />
                         </div>
                         <span className="text-xs font-mono text-blue-300 font-bold uppercase">Signal: BLE Beacon (Crowdsourced)</span>
                    </>
                ) : (
                    <>
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-xs font-mono text-slate-300">{isOnline ? 'DEVICE ONLINE' : 'DEVICE OFFLINE'}</span>
                    </>
                )}
             </div>
             
             <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-xs text-slate-500 hover:text-white"
            >
                Logout
            </button>
             <button 
                onClick={resetSystem}
                className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-4"
            >
                Reset Prototype
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Status & Map */}
        <div className="w-1/3 border-r border-slate-800 p-6 flex flex-col gap-6 bg-slate-900/30">
            
            {/* Device Status Card */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm text-slate-400 mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> DEVICE STATUS
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Power State</span>
                        <span className={`font-mono font-bold ${
                            isSpyActive ? 'text-red-400' : 
                            isHardLocked ? 'text-red-500' :
                            phoneState === PhoneState.REAL_SHUTDOWN ? 'text-gray-500' : 'text-green-400'
                        }`}>
                            {isHardLocked ? 'SYSTEM DISABLED' :
                             phoneState === PhoneState.FAKE_SHUTDOWN ? 'FAKE SHUTDOWN' : 
                             phoneState === PhoneState.REAL_SHUTDOWN ? 'OFFLINE' : 'ACTIVE'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Network</span>
                        {isSpyActive && phantomConfig.bleBeacon ? (
                            <span className="text-blue-300 flex items-center gap-1 font-mono text-xs">
                                <Bluetooth className="w-3 h-3" /> BLE Beacon Active
                            </span>
                        ) : (
                            <span className="text-slate-300 flex items-center gap-1">
                                <Wifi className="w-3 h-3" /> 5G Encrypted
                            </span>
                        )}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Owner</span>
                        <span className="text-slate-300 text-xs">
                           {phantomConfig.recoveryEmail || 'Unknown'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Remote Actions Panel (Updated) */}
             <div className="bg-red-900/10 rounded-xl p-4 border border-red-900/30">
                 <h3 className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                     <AlertTriangle className="w-3 h-3" /> Danger Zone
                 </h3>
                 
                 <div className="space-y-3">
                     {/* On-Demand Audio Recording */}
                     <div className="flex flex-col gap-1">
                         <button 
                            onClick={onRecordRequest}
                            disabled={!isSpyActive || isRemoteRecording}
                            className={`w-full border rounded-lg py-3 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group ${
                                isRemoteRecording 
                                ? 'bg-red-600 border-red-500 text-white animate-pulse'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                            }`}
                         >
                             {isRemoteRecording ? (
                                 <>
                                    <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                                    RECORDING...
                                 </>
                             ) : (
                                 <>
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                    🎧 RECORD LIVE AUDIO (30s)
                                 </>
                             )}
                         </button>
                         <div className="text-[10px] text-center font-mono">
                             {isRemoteRecording ? (
                                 <span className="text-red-400">Status: Recording... Please Wait</span>
                             ) : (
                                 <span className="text-slate-500">Status: Ready to Record</span>
                             )}
                         </div>
                     </div>

                     {/* Hard Lock */}
                     <button 
                        onClick={onHardLock}
                        disabled={isHardLocked || !isOnline}
                        className="w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 rounded-lg py-3 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                     >
                         <Lock className="w-3 h-3 group-hover:scale-110 transition-transform" />
                         {isHardLocked ? 'DEVICE LOCKED' : 'REMOTE HARD LOCK'}
                     </button>
                 </div>
             </div>

             {/* Live Map Placeholder */}
             <div className="flex-1 bg-slate-800/50 rounded-xl border border-slate-700 relative overflow-hidden group">
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur px-2 py-1 rounded text-xs font-mono text-cyan-400 border border-cyan-900/50 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> GPS TRACKING
                </div>
                
                {/* Simulated Map Visual */}
                <div className={`w-full h-full bg-slate-900 opacity-60 flex items-center justify-center ${isSpyActive ? 'opacity-100' : 'grayscale'}`}>
                    {/* Grid Lines */}
                    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.2 }}></div>
                    
                    {/* Radar Pulse Effect */}
                    {isSpyActive && (
                        <div className="relative">
                            <div className="absolute -inset-4 bg-cyan-500/20 rounded-full animate-ping" />
                            <div className="absolute -inset-8 bg-cyan-500/10 rounded-full animate-pulse" />
                            <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] relative z-10" />
                        </div>
                    )}
                </div>
             </div>
        </div>

        {/* Right Column: Evidence & Logs */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
            
            {/* Intruder Capture Section */}
            <div className={`transition-all duration-700 ${isSpyActive ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-4 blur-sm'}`}>
                <h3 className="text-sm text-red-400 mb-3 flex items-center gap-2 font-bold animate-pulse">
                    <Camera className="w-4 h-4" /> EVIDENCE CAPTURED
                </h3>
                <div className="flex gap-4">
                    <div className="w-48 h-32 bg-slate-800 rounded-lg border-2 border-red-500/30 overflow-hidden relative shadow-[0_0_20px_rgba(239,68,68,0.1)] group">
                        {isSpyActive ? (
                            evidenceImage ? (
                                <>
                                    <img src={evidenceImage} alt="Intruder" className="w-full h-full object-cover opacity-90 transition-opacity group-hover:opacity-100" />
                                    <div className="absolute bottom-0 left-0 right-0 bg-red-900/80 text-[10px] text-white p-1 text-center font-mono">
                                        CAM_FRONT_01 // REC
                                    </div>
                                    <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500" />
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2 bg-slate-900">
                                    <AlertCircle className="w-6 h-6 opacity-50" />
                                    <span className="text-[10px] uppercase tracking-wider">Camera Unavailable</span>
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">AWAITING TRIGGER</div>
                        )}
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-2">
                        {/* Audio Player */}
                        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700 flex flex-col justify-center min-h-[80px]">
                            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                                <Mic className="w-3 h-3" /> Ambient Audio
                            </div>
                            {evidenceAudio ? (
                                <audio controls src={evidenceAudio} className="w-full h-8 block opacity-80 hover:opacity-100 transition-opacity" />
                            ) : (
                                <div className="text-xs text-slate-600 italic">No Audio Detected</div>
                            )}
                        </div>

                        {/* Transcript (Placeholder) */}
                        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700 flex-1">
                             <div className="text-xs text-slate-500 mb-1">Transcript (AI)</div>
                             <div className="font-mono text-[10px] text-cyan-300/80 italic leading-relaxed">
                                {isSpyActive ? (evidenceAudio ? '"...just keep walking... check the pockets..."' : 'Listening...') : '...'}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Logs */}
            <div className="flex-1 bg-black/40 rounded-xl border border-slate-800 p-4 font-mono text-xs overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 text-slate-500 mb-3 border-b border-slate-800 pb-2">
                    <Activity className="w-3 h-3" /> SYSTEM LOGS
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {logs.length === 0 && <span className="text-slate-600 italic">System initialized. Waiting for events...</span>}
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 animate-fade-in-left">
                            <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                            <span className={`${
                                log.type === 'danger' ? 'text-red-400' : 
                                log.type === 'alert' ? 'text-amber-400' : 'text-cyan-400'
                            }`}>
                                {log.event}
                            </span>
                            <span className="text-slate-400 opacity-60">- {log.details}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default CommandCenter;