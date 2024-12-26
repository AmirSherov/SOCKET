import React, { useState, useEffect, useRef } from "react";
import "./chating.scss";
import { useParams } from "react-router-dom";
import { useGlobalContext } from "../../../context";
import { FaCloudUploadAlt } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { init } from "filestack-js";
import ChatingHeader from "../chatingheader";
import { realtimeDb, firestoreDb } from '../../../api/firebaseConfig';
import { ref, push, onChildAdded, remove, off, onChildRemoved, update, onChildChanged } from 'firebase/database'; // добавляем update
import { doc, getDoc, updateDoc, arrayUnion, collection, getDocs, setDoc } from 'firebase/firestore';
import Loader from '../../ui/Loader';
import toast from 'react-hot-toast';
import { MdOutlineFileDownload } from "react-icons/md";
import { BsCheck, BsCheckAll } from "react-icons/bs";
const client = init("A9SyIIcLaSvaAOwQJBrC4z");

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const downloadImage = async (url, filename) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch (error) {
    console.error('Download failed:', error);
    toast.error('Failed to download image');
  }
};

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

        // Добавляем слушатель изменений сообщений
        const messageChangedHandler = onChildChanged(messagesRef, (snapshot) => {
          if (isSubscribed) {
            const changedMessage = {
              ...snapshot.val(),
              firebaseKey: snapshot.key
            };
            setMessages(prev => prev.map(msg => 
              msg.firebaseKey === snapshot.key ? changedMessage : msg
            ));
          }
        });

        onChildAdded(messagesRef, messageAddedHandler);
        onChildRemoved(messagesRef, messageRemovedHandler);

        return () => {
          isSubscribed = false;
          off(messagesRef, 'child_added', messageAddedHandler);
          off(messagesRef, 'child_removed', messageRemovedHandler);
          off(messagesRef, 'child_changed', messageChangedHandler); // Отписываемся от изменений
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
      senderId: userId,
      status: 'delivered', // Add initial status
      unread: true  // Добавляем флаг непрочитанного сообщения
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
          senderId: userId,
          unread: true,  // Добавляем флаг непрочитанного
          status: 'delivered'
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

  // Add new function to mark messages as read
  const markMessagesAsRead = async () => {
    if (!chatidSelected) return;

    try {
      // Помечаем последнее сообщение как прочитанное в Firestore
      const chatRef = doc(firestoreDb, 'chats', chatidSelected);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        if (chatData.lastMessage?.senderId !== userId && chatData.lastMessage?.unread) {
          await updateDoc(chatRef, {
            'lastMessage.unread': false,
            'lastMessage.status': 'read'
          });
        }
      }

      // Помечаем все сообщения как прочитанные в Realtime Database
      const unreadMessages = messages.filter(msg => 
        msg.senderId !== userId && 
        (msg.unread || msg.status !== 'read')
      );

      for (const msg of unreadMessages) {
        const messageRef = ref(realtimeDb, `chats/${chatidSelected}/messages/${msg.firebaseKey}`);
        await update(messageRef, { 
          status: 'read',
          unread: false 
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
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
    setTouchStartTime(Date.now());
    
    const timer = setTimeout(() => {
      if (senderId === userId) {
        const touch = e.touches[0];
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
    if (touchTimer) {
      clearTimeout(touchTimer);
    }
    
    // Если касание было коротким, не показываем меню
    if (Date.now() - touchStartTime < 500) {
      setContextMenu({ visible: false, x: 0, y: 0, messageId: null });
    }
  };

  const handleTouchMove = (e) => {
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
        // Если есть другие сообщения, обновляем lastMessage на последнее сообщение
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

  // Обновляем useEffect для отслеживания прочтения сообщений
  useEffect(() => {
    if (!chatidSelected || loading) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead();
      }
    };

    // Вызываем при открытии чата и при получении новых сообщений
    markMessagesAsRead();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [chatidSelected, messages, userId, loading]);

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
            <div className="message-content">
              {msg.text && <p>{msg.text}</p>}
              {msg.file && (
                <div className="image-container">
                    <MdOutlineFileDownload
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(msg.file, `image-${msg.id}.jpg`);
                    }}
                    className="download-button"/>
                  <img src={msg.file} alt="Uploaded file" className="message-image" />
                </div>
              )}
           </div>
            <div className="message-info">
              <span className="message-timestamp">{formatTimestamp(msg.timestamp)}</span>
              {msg.senderId === userId && (
                <span className="message-status">
                  {msg.status === 'read' ? <BsCheckAll /> : <BsCheck />}
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={() => deleteMessage(contextMenu.messageId, contextMenu.firebaseKey)}></button>
            Удалить сообщение
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

