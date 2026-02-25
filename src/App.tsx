/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TelemetryAnalyzer } from './components/TelemetryAnalyzer';
import { Chatbot } from './components/Chatbot';
import { ImageGenerator } from './components/ImageGenerator';
import { SpeechGenerator } from './components/SpeechGenerator';

export default function App() {
  const [activeTab, setActiveTab] = useState('telemetry');

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 relative overflow-hidden">
        {activeTab === 'telemetry' && <TelemetryAnalyzer />}
        {activeTab === 'chat' && <Chatbot />}
        {activeTab === 'visualizer' && <ImageGenerator />}
        {activeTab === 'audio' && <SpeechGenerator />}
      </main>
    </div>
  );
}

