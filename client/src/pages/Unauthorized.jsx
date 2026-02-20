import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

const Unauthorized = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-500">
                {/* Icon Circle */}
                <div className="relative mx-auto w-32 h-32">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                    <div className="relative bg-red-500/10 border border-red-500/20 w-32 h-32 rounded-full flex items-center justify-center text-red-500">
                        <ShieldAlert size={64} />
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        Access Denied
                    </h1>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        Oops! You don't have the required permissions to access this terminal.
                        Please contact your administrator if you believe this is a mistake.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-all active:scale-95 border border-gray-700"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl transition-all shadow-glow-orange active:scale-95"
                    >
                        <Home size={18} />
                        Launchpad
                    </button>
                </div>

                <div className="pt-12">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent" />
                    <p className="mt-4 text-gray-600 text-[10px] uppercase font-bold tracking-[0.2em]">
                        SaaS Security Protocol Active
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;
