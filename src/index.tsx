import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

//引入chakra-ui，为主题对象提供上下文环境
//Introducing chakra ui to provide a contextual environment for theme objects
import { ChakraProvider } from '@chakra-ui/react'

//react根节点入口
//React Root Node Entry
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ChakraProvider>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
