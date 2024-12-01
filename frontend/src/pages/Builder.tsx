import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StepsList } from '../components/StepsList';
import { FileExplorer } from '../components/FileExplorer';
import { TabView } from '../components/TabView';
import { CodeEditor } from '../components/CodeEditor';
import { PreviewFrame } from '../components/PreviewFrame';
import { Step, FileItem, StepType } from '../types';
import axios from 'axios';
import { BACKEND_URL } from '../config';
import { parseXml } from '../steps';
import { useWebContainer } from '../hooks/useWebContainer';
import { Bot, Code2, Files, Play, Send, Download } from 'lucide-react';
import { Loader } from '../components/Loader';
import JSZip from 'jszip';

export function Builder() {
  const location = useLocation();
  const { prompt } = location.state as { prompt: string };
  const [userPrompt, setPrompt] = useState("");
  const [llmMessages, setLlmMessages] = useState<{role: "user" | "assistant", content: string;}[]>([]);
  const [loading, setLoading] = useState(false);
  const [templateSet, setTemplateSet] = useState(false);
  const [webcontainerReady, setWebcontainerReady] = useState(false);
  const webcontainer = useWebContainer();

  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const downloadZip = async () => {
    const zip = new JSZip();

    const addToZip = (items: FileItem[], currentPath: string = '') => {
      items.forEach(item => {
        const itemPath = `${currentPath}${item.name}`;
        if (item.type === 'file') {
          zip.file(itemPath, item.content || '');
        } else if (item.type === 'folder' && item.children) {
          addToZip(item.children, `${itemPath}/`);
        }
      });
    };

    addToZip(files);

    const content = await zip.generateAsync({ type: "blob" });
    const url = window.URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project-files.zip';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };
  useEffect(() => {
    let originalFiles = [...files];
    let updateHappened = false;
    steps.filter(({status}) => status === "pending").map(step => {
      updateHappened = true;
      if (step?.type === StepType.CreateFile) {
        let parsedPath = step.path?.split("/") ?? []; // ["src", "components", "App.tsx"]
        let currentFileStructure = [...originalFiles]; // {}
        let finalAnswerRef = currentFileStructure;
  
        let currentFolder = ""
        while(parsedPath.length) {
          currentFolder =  `${currentFolder}/${parsedPath[0]}`;
          let currentFolderName = parsedPath[0];
          parsedPath = parsedPath.slice(1);
  
          if (!parsedPath.length) {
            // final file
            let file = currentFileStructure.find(x => x.path === currentFolder)
            if (!file) {
              currentFileStructure.push({
                name: currentFolderName,
                type: 'file',
                path: currentFolder,
                content: step.code
              })
            } else {
              file.content = step.code;
            }
          } else {
            /// in a folder
            let folder = currentFileStructure.find(x => x.path === currentFolder)
            if (!folder) {
              // create the folder
              currentFileStructure.push({
                name: currentFolderName,
                type: 'folder',
                path: currentFolder,
                children: []
              })
            }
  
            currentFileStructure = currentFileStructure.find(x => x.path === currentFolder)!.children!;
          }
        }
        originalFiles = finalAnswerRef;
      }
    })

    if (updateHappened) {
      setFiles(originalFiles)
      setSteps(steps => steps.map((s: Step) => ({
        ...s,
        status: "completed"
      })))
    }
  }, [steps, files]);

  useEffect(() => {
    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {};
  
      const processFile = (file: FileItem, isRootFolder: boolean) => {  
        if (file.type === 'folder') {
          mountStructure[file.name] = {
            directory: file.children ? 
              Object.fromEntries(
                file.children.map(child => [child.name, processFile(child, false)])
              ) 
              : {}
          };
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || ''
              }
            };
          } else {
            return {
              file: {
                contents: file.content || ''
              }
            };
          }
        }
        return mountStructure[file.name];
      };
  
      files.forEach(file => processFile(file, true));
      return mountStructure;
    };
  
    const mountStructure = createMountStructure(files);
  
    if (webcontainer) {
      webcontainer.mount(mountStructure).then(() => {
        setWebcontainerReady(true);
      });
    }
  }, [files, webcontainer]);

  async function init() {
    const response = await axios.post(`${BACKEND_URL}/template`, {
      prompt: prompt.trim()
    });
    setTemplateSet(true);
    
    const {prompts, uiPrompts} = response.data;

    setSteps(parseXml(uiPrompts[0]).map((x: Step) => ({
      ...x,
      status: "pending"
    })));

    setLoading(true);
    const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
      messages: [...prompts, prompt].map(content => ({
        role: "user",
        content
      }))
    })

    setLoading(false);

    setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
      ...x,
      status: "pending" as "pending"
    }))]);

    setLlmMessages([...prompts, prompt].map(content => ({
      role: "user",
      content
    })));

    setLlmMessages(x => [...x, {role: "assistant", content: stepsResponse.data.response}])
  }

  useEffect(() => {
    init();
  }, [])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 flex flex-col overflow-hidden">
      <header className="bg-gray-800/50 backdrop-blur-md border-b border-gray-700/50 px-8 py-4 flex-none">
        <div className="flex items-center gap-4">
          <Bot className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              CodePlay 
            </h1>
            <p className="text-sm text-gray-300 mt-1 font-medium">
              Building: {prompt}
            </p>
          </div>
        </div>
      </header>
      
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-4 gap-6 h-full">
          {/* Build Steps Section */}
          <div className="col-span-1 bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
            <div className="p-4 flex-none">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-blue-400" />
                Build Steps
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
              <StepsList
                steps={steps}
                currentStep={currentStep}
                onStepClick={setCurrentStep}
              />
            </div>

            <div className="p-4 border-t border-gray-700/50 flex-none">
              {(loading || !templateSet) ? (
                <div className="flex items-center justify-center p-4">
                  <Loader />
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={userPrompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Give additional instructions..."
                    className="w-full h-20 bg-gray-900/80 text-gray-100 border border-gray-700/50 rounded-lg p-3 resize-none placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    onClick={async () => {
                      if (!userPrompt.trim()) return;
                      
                      const newMessage = {
                        role: "user" as "user",
                        content: userPrompt
                      };

                      setLoading(true);
                      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
                        messages: [...llmMessages, newMessage]
                      });
                      setLoading(false);

                      setLlmMessages(x => [...x, newMessage, {
                        role: "assistant",
                        content: stepsResponse.data.response
                      }]);
                      
                      setSteps(s => [...s, ...parseXml(stepsResponse.data.response).map(x => ({
                        ...x,
                        status: "pending" as "pending"
                      }))]);
                      
                      setPrompt("");
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Send Instructions
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* File Explorer Section */}
          <div className="col-span-1 bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
            <div className="p-4 flex-none">
              <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                <Files className="w-5 h-5 text-blue-400" />
                File Explorer
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
              <FileExplorer 
                files={files} 
                onFileSelect={setSelectedFile}
              />
            </div>
          </div>

          {/* Code Editor and Preview Section */}
          <div className="col-span-2 bg-gray-800/40 backdrop-blur-md rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
            <div className="p-4 flex-none flex justify-between items-center">
              <TabView activeTab={activeTab} onTabChange={setActiveTab} />
              <button
                onClick={downloadZip}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                Download ZIP
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'code' ? (
                <div className="h-full overflow-y-auto custom-scrollbar">
                  <CodeEditor file={selectedFile} />
                </div>
              ) : (
                webcontainerReady && webcontainer ? (
                  <PreviewFrame webContainer={webcontainer} files={files} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Loader />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.7);
        }
        @keyframes slide-in {
          from { transform: translateX(-10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}