# keyword-helper-back-chat

import React, {useState, useEffect} from 'react'
import './App.css';
import { io } from "socket.io-client";

const socket = io("https://keyword-helper-back-chat-production.up.railway.app", {
  withCredentials: true,
})

function App() {
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isEnter, setIsEnter] = useState(false);

  const enterRoom = () => {
    socket.emit("enter", nickname);
    setIsEnter(true);
  };

  useEffect(() => {
    socket.on("new_entry", (nickname) => {
      console.log(`${nickname}님이 입장하였습니다.`);
    });
  })

  const sendMessage = () => {
    console.log(message);
    socket.emit("new_message", message);
    setMessage('');
  }

useEffect(() => {
  socket.on("new_message", (msg) => {
    console.log("새로운 메시지가 있습니다.")
    console.log(`'${msg}'`)
  })
}, [])


  return (
    <div className="App">
      {isEnter ? (
        <div id='textContainer'>
          <input type='text' placeholder='메시지' required onChange={(e) => setMessage(e.target.value)}/>
          <button value="보내기" onClick={sendMessage} />
        </div>
      ) : (
        <div>
          <input type='text' placeholder='닉네임' maxLength={10} required onChange={(e) => setNickname(e.target.value)}/>
          <button value="입장하기" onClick={enterRoom} />
        </div>
      )}
    </div>
  );
}

export default App;
