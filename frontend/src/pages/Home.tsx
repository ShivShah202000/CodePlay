import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Layout, LucideIcon, Terminal, Bot, Sparkles } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description }) => (
  <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl transform transition-all duration-300 hover:scale-105 hover:bg-gray-800/70 border border-gray-700/50">
    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 mb-4">
      <Icon className="w-6 h-6 text-blue-400" />
    </div>
    <h3 className="text-xl font-semibold text-gray-100 mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

export function Home() {
  const [prompt, setPrompt] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full filter blur-3xl animate-pulse -top-48 -left-48" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full filter blur-3xl animate-pulse -bottom-48 -right-48" />
      </div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-12 space-y-6">
          <div className="flex justify-center mb-6 relative">
            <div className="relative">
              <Bot className="w-16 h-16 text-blue-400 animate-bounce" />
              <div className="absolute top-0 left-0 w-16 h-16 bg-blue-400 filter blur-xl opacity-50 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4 animate-fade-in">
            CodePlay
          </h1>
          
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Transform your ideas into reality with our AI-powered website builder.
            Describe your vision, and watch it come to life.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mb-12">
          <div className="bg-gray-800/40 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-gray-700/50 transform transition-all duration-300 hover:shadow-blue-500/20">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your website in detail..."
              className="w-full h-40 p-6 bg-gray-900/90 text-gray-100 border border-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/50 focus:border-transparent resize-none placeholder-gray-500 text-lg transition-all duration-300"
            />
            
            <button
              type="submit"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-gray-100 py-4 px-8 rounded-xl font-medium transition-all duration-300 hover:from-blue-500 hover:to-blue-600 transform hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25 relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <span>Generate Website </span>
                <Sparkles className={`w-5 h-5 transition-transform duration-500 ${isHovered ? 'rotate-12' : ''}`} />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </form>

        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Code}
            title="AI-Powered Code"
            description="Generate clean, modern code that follows best practices and latest web standards."
          />
          <FeatureCard
            icon={Layout}
            title="Responsive Design"
            description="Create websites that look great on all devices, from mobile to desktop."
          />
          <FeatureCard
            icon={Terminal}
            title="Code Preview"
            description="Get interactive previews of your code with file structure"
          />
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}