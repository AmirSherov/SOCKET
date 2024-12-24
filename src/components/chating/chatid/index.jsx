import React, { useState, useEffect, useRef } from "react";
import "./chating.scss";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "../../../context";
import { FaCloudUploadAlt } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { init } from "filestack-js";
import ChatingHeader from "../chatingheader";
import { realtimeDb, firestoreDb } from '../../../api/firebaseConfig';
import { ref, push, onChildAdded, remove, off, onChildRemoved } from 'firebase/database';
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, setDoc } from 'firebase/firestore';
import Loader from '../../ui/Loader';
import toast from 'react-hot-toast';

const client = init("A9SyIIcLaSvaAOwQJBrC4z");

export default function Chating() {
  const { state } = useGlobalContext();
  const { chatid } = useParams();
  const chatidSelected = state.selectedChat || chatid;
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = state.user.id || localStorage.getItem('userId');
  const messagesEndRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null });
  const [touchTimer, setTouchTimer] = useState(null);
  const [touchStartTime, setTouchStartTime] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const loadChatData = async () => {
      setMessages([]);
      setLoading(true);

      if (!chatidSelected) {
        setLoading(false);
        return;
      }

      try {
        const chatRef = doc(firestoreDb, 'chats', chatidSelected);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          console.error("Chat not found");
          return;
        }

        const messagesRef = ref(realtimeDb, `chats/${chatidSelected}/messages`);
        let isSubscribed = true;

        // Слушатель новых сообщений
        const messageAddedHandler = (snapshot) => {
          if (isSubscribed) {
            const newMessage = {
              ...snapshot.val(),
              firebaseKey: snapshot.key
            };
            setMessages(prev => {
              const messageExists = prev.some(msg => msg.firebaseKey === snapshot.key);
              return messageExists ? prev : [...prev, newMessage];
            });
            setTimeout(scrollToBottom, 100);
          }
        };

        // Слушатель удаленных сообщений
        const messageRemovedHandler = (snapshot) => {
          if (isSubscribed) {
            setMessages(prev => prev.filter(msg => msg.firebaseKey !== snapshot.key));
          }
        };

        onChildAdded(messagesRef, messageAddedHandler);
        onChildRemoved(messagesRef, messageRemovedHandler);

        return () => {
          isSubscribed = false;
          off(messagesRef, 'child_added', messageAddedHandler);
          off(messagesRef, 'child_removed', messageRemovedHandler);
        };

      } catch (error) {
        toast.error('Error loading chat');
      } finally {
        setLoading(false);
      }
    };

    loadChatData();

    return () => {
      setMessages([]);
      setSelectedFile(null);
      setFileName("");
      setMessage("");
    };
  }, [chatidSelected]);

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

    const currentMessage = message;
    const currentFile = selectedFile;

    setMessage("");
    setSelectedFile(null);
    setFileName("");

    const newMessage = {
      id: Date.now().toString(),
      text: currentMessage,
      file: currentFile,
      timestamp: Date.now(),
      senderId: userId
    };

    try {
      // Define messagesRef once at the beginning
      const messagesRef = ref(realtimeDb, `chats/${chatidSelected}/messages`);
      await push(messagesRef, newMessage);
      
      const chatRef = doc(firestoreDb, 'chats', chatidSelected);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        const recipientId = chatidSelected.replace(userId, '').replace('-', '');
        
        // ...existing chat creation code...
      }
    
      // Update lastMessage
      await updateDoc(chatRef, {
        lastMessage: {
          text: currentMessage,
          timestamp: Date.now(),
          senderId: userId
        }
      });

      setTimeout(scrollToBottom, 100);
      toast.success('Message sent');
    } catch (error) {
      toast.error('Error sending message');
      setMessage(currentMessage);
      setSelectedFile(currentFile);
      setFileName(fileName);
    }
  };

  // Добавляем обработчик контекстного меню
  const handleContextMenu = (e, messageId, senderId, firebaseKey) => {
    e.preventDefault();
    // Проверяем, принадлежит ли сообщение текущему пользователю
    if (senderId === userId) {
      setContextMenu({
        visible: true,
        x: e.pageX,
        y: e.pageY,
        messageId,
        firebaseKey
      });
    }
  };

  // Добавляем обработчики touch событий
  const handleTouchStart = (e, messageId, senderId, firebaseKey) => {
    e.preventDefault();
    setTouchStartTime(Date.now());
    
    const timer = setTimeout(() => {
      if (senderId === userId) {
        const touch = e.touches[0];
        const element = document.getElementById(`message-${messageId}`);
        const rect = element.getBoundingClientRect();
        
        setContextMenu({
          visible: true,
          x: touch.pageX,
          y: touch.pageY,
          messageId,
          firebaseKey
        });
      }
    }, 500);
    
    setTouchTimer(timer);
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    if (touchTimer) {
      clearTimeout(touchTimer);
    }
    
    // Если касание было коротким, не показываем меню
    if (Date.now() - touchStartTime < 500) {
      setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (touchTimer) {
      clearTimeout(touchTimer);
      setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
    }
  };

  // Добавляем функцию удаления сообщения
  const deleteMessage = async (messageId, firebaseKey) => {
    try {
      const messageRef = ref(realtimeDb, `chats/${chatidSelected}/messages/${firebaseKey}`);
      await remove(messageRef);

      // После удаления сообщения проверяем, остались ли ещё сообщения
      const chatRef = doc(firestoreDb, 'chats', chatidSelected);
      const messagesRef = ref(realtimeDb, `chats/${chatidSelected}/messages`);
      
      // Получаем все оставшиеся сообщения
      const remainingMessages = messages.filter(msg => msg.id !== messageId);
      
      // Если сообщений больше нет или последнее сообщение было удалено
      if (remainingMessages.length === 0) {
        // Обновляем lastMessage на null
        await updateDoc(chatRef, {
          lastMessage: null
        });
      } else {
        // Если есть другие сообщения, обновляем lastMessage на последнее сообщен��е
        const lastMsg = remainingMessages[remainingMessages.length - 1];
        await updateDoc(chatRef, {
          lastMessage: {
            text: lastMsg.text,
            timestamp: lastMsg.timestamp,
            senderId: lastMsg.senderId
          }
        });
      }

      setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Error deleting message');
    }
  };

  // Добавляем обработчик клика вне контекстного меню
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (!chatidSelected) {
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
          <div
            key={index}
            id={`message-${msg.id}`}
            className={`message ${msg.senderId === userId ? 'sent' : 'received'}`}
            onContextMenu={(e) => handleContextMenu(e, msg.id, msg.senderId, msg.firebaseKey)}
            onTouchStart={(e) => handleTouchStart(e, msg.id, msg.senderId, msg.firebaseKey)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            {msg.text && <p>{msg.text}</p>}
            {msg.file && <img src={msg.file} alt="Uploaded file" className="message-image" />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => deleteMessage(contextMenu.messageId, contextMenu.firebaseKey)}>
            Удалить сообщение
          </button>
        </div>
      )}
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

