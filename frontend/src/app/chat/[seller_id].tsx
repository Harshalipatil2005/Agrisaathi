import { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

type Message = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  text: string;
  timestamp: string;
};

export default function Chat() {
  const { seller_id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const currentUserId = 'current-user-id'; // Replace with actual user ID

  useEffect(() => {
    if (seller_id) fetchMessages();
    const interval = setInterval(() => {
      if (seller_id) fetchMessages();
    }, 2000);
    return () => clearInterval(interval);
  }, [seller_id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`http://localhost:8000/messages/conversation/${currentUserId}/${seller_id}`);
      const data = await res.json();
      setMessages(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await fetch('http://localhost:8000/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: currentUserId,
          to_user_id: seller_id,
          text: newMessage,
        }),
      });
      setNewMessage('');
      await fetchMessages();
    } catch (e) {
      console.error(e);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.from_user_id === currentUserId ? styles.messageSent : styles.messageReceived]}>
      <Text style={styles.messageText}>{item.text}</Text>
      <Text style={styles.messageTime}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💬 Chat with Seller</Text>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        style={styles.messageList}
        inverted={false}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <Button title="Send" onPress={handleSendMessage} color="#7c3aed" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3e8ff' },
  header: { backgroundColor: '#7c3aed', padding: 16, paddingTop: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 12 },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  messageList: { flex: 1, padding: 12 },
  messageBubble: { maxWidth: '80%', marginVertical: 4, padding: 10, borderRadius: 12 },
  messageSent: { alignSelf: 'flex-end', backgroundColor: '#7c3aed' },
  messageReceived: { alignSelf: 'flex-start', backgroundColor: '#e0e0e0' },
  messageText: { color: '#000', fontSize: 14 },
  messageTime: { fontSize: 11, color: '#666', marginTop: 4 },
  inputContainer: { backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#ddd' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, maxHeight: 100 },
});
