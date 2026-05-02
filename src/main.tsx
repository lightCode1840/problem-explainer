import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { VideoProvider } from './stores/videoStore';
import { WorkflowProvider } from './stores/workflowStore';
import { PluginProvider } from './stores/pluginStore';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PluginProvider>
      <VideoProvider>
        <WorkflowProvider>
          <App />
        </WorkflowProvider>
      </VideoProvider>
    </PluginProvider>
  </React.StrictMode>
);
