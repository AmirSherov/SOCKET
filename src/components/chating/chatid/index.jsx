import React, { useState, useEffect } from "react";
import "./chating.scss";
import { useGlobalContext } from "../../../context";
import { FaCloudUploadAlt } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { init } from "filestack-js";
import ChatingHeader from "../chatingheader";
import { realtimeDb, firestoreDb } from '../../../api/firebaseConfig';
import { ref, push, onChildAdded } from 'firebase/database';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import Loader from '../../ui/Loader';

const client = init("A9SyIIcLaSvaAOwQJBrC4z");

export default function Chating() {
  const { state } = useGlobalContext();
  const chatid = state.selectedChat; 
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChatData = async () => {
      if (!chatid) return;
      setLoading(true);

      try {
        // Получаем данные чата из Firestore
        const chatRef = doc(firestoreDb, 'chats', chatid);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          console.error("Chat not found");
          return;
        }

        // Подписываемся на сообщения в Realtime Database
        const messagesRef = ref(realtimeDb, `chats/${chatid}/messages`);
        const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
          const newMessage = snapshot.val();
          setMessages(prev => [...prev, newMessage]);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error("Error loading chat:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChatData();
  }, [chatid]);

  const openFilestack = () => {
    const options = {
      accept: ['image/*'],
      fromSources: ['local_file_system'],
      onUploadDone: (response) => {
        if (response.filesUploaded.length > 0) {
          const uploadedFileUrl = response.filesUploaded[0].url; 
          setSelectedFile(uploadedFileUrl);
          setFileName(response.filesUploaded[0].filename);
        }
      },
    };
  
    const picker = client.picker(options);
    picker.open();
  };

  const sendMessage = async () => {
    if (!message.trim() && !selectedFile) return;

    const newMessage = {
      text: message,
      file: selectedFile,
      timestamp: Date.now(),
      senderId: state.user.id
    };

    try {
      // Отправляем в Realtime Database
      const messagesRef = ref(realtimeDb, `chats/${chatid}/messages`);
      await push(messagesRef, newMessage);

      // Обновляем последнее сообщение в Firestore
      const chatRef = doc(firestoreDb, 'chats', chatid);
      await updateDoc(chatRef, {
        lastMessage: {
          text: message,
          timestamp: Date.now(),
          senderId: state.user.id
        }
      });

      setMessage("");
      setSelectedFile(null);
      setFileName("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  if (!chatid) {
    return (
      <div className="chating-container">
        <div className="no-chat-selected">
          <h2>Выберите чат для начала общения</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chating-container">
        <Loader />
      </div>
    );
  }

  return (
    <div className={`chating-container ${state.sidebarClose ? "sidebar-close" : ""}`}>
      <ChatingHeader />
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.senderId === state.user.id ? 'sent' : 'received'}`}>
            {msg.text && <p>{msg.text}</p>}
            {msg.file && <img src={msg.file} alt="Uploaded file" className="message-image" />}
          </div>
        ))}
      </div>
      <div className="chating-footer">
        <div>
          <button onClick={openFilestack} className="file-upload-button">
            <FaCloudUploadAlt />
            Загрузить файл
          </button>
        </div>
        <div className="input-container">
          <input 
            type="text" 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Введите сообщение" 
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          {fileName && <div className="file-name">{fileName}</div>}
        </div>
        <div>
          <button 
            onClick={sendMessage} 
            disabled={!message.trim() && !selectedFile}
            className="send-button"
          >
            <IoSend />
          </button>
        </div>
      </div>
    </div>
  );
}

