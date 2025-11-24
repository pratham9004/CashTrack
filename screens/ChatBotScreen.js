import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { GEMINI_API_KEY } from "@env";
import { useSettings } from '../contexts/SettingsContext';
import Header from '../components/Header';

export default function ChatBotScreen() {
  const { getThemeColors } = useSettings();
  const theme = getThemeColors();
  const [messages, setMessages] = useState([
    { sender: "bot", text: "👋 Hi! I'm CashTrack Assistant. How can I help with your finances today?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Fetch user's finance data from Firestore
  const fetchUserData = async () => {
    if (!user) return;
    try {
      let totalIncome = 0, incomeSources = [];
      let totalExpenses = 0, expenseCategories = {};
      let totalSavings = 0, savingsGoals = [];

      const incomeSnap = await getDocs(collection(db, "users", user.uid, "income"));
      incomeSnap.forEach((doc) => {
        const data = doc.data();
        totalIncome += Number(data.amount || 0);
        incomeSources.push(data);
      });

      const expenseSnap = await getDocs(collection(db, "users", user.uid, "expenses"));
      expenseSnap.forEach((doc) => {
        const data = doc.data();
        totalExpenses += Number(data.amount || 0);
        const category = data.category || 'Other';
        if (!expenseCategories[category]) expenseCategories[category] = 0;
        expenseCategories[category] += Number(data.amount || 0);
      });

      const savingsSnap = await getDocs(collection(db, "users", user.uid, "savings"));
      savingsSnap.forEach((doc) => {
        const data = doc.data();
        totalSavings += Number(data.savedAmount || 0);
        savingsGoals.push(data);
      });

      setUserData({ totalIncome, incomeSources, totalExpenses, expenseCategories, totalSavings, savingsGoals });
      console.log('User data fetched successfully:', { totalIncome, incomeSources, totalExpenses, expenseCategories, totalSavings, savingsGoals });
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData({ totalIncome: 0, incomeSources: [], totalExpenses: 0, expenseCategories: {}, totalSavings: 0, savingsGoals: [] });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const newMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setLoading(true);

    console.log('Starting sendMessage, user:', user);

    if (!user) {
      setMessages((prev) => [...prev, { sender: "bot", text: "Please log in to use the chatbot." }]);
      setLoading(false);
      return;
    }

    // Refresh user data before sending message
    await fetchUserData();
    console.log('Fetched userData:', userData);

    const botReply = await sendMessage(input, userData);
    setMessages((prev) => [...prev, { sender: "bot", text: botReply }]);

    setLoading(false);
  };

  const sendMessage = async (userMessage, userData) => {
    if (!userMessage.trim()) return "Please provide a message.";

    if (!GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY');
      return "API key is missing. Please check your configuration.";
    }

    const systemPrompt = `
You are CashTrack AI Assistant.

Your job is to give accurate, personalized answers based ONLY on:
1. The user's real financial data from the CashTrack app
2. The user's question

======================
CASH TRACK USER DATA:
- Total Income: {{totalIncome}}
- Income Sources: {{incomeSources}}

- Total Expenses: {{totalExpenses}}
- Expense Categories: {{expenseCategories}}

- Total Savings: {{totalSavings}}
- Savings Goals: {{savingsGoals}}
======================

RULES FOR ANALYSIS:
1. ALWAYS use the user's real numbers (income, expenses, categories, goals) when giving financial advice.
2. If the question is related to:
   - savings
   - budgeting
   - expense analysis
   - financial planning
   - monthly improvement
   - goal progress
   - spending habits
   → Use the real data in CASH TRACK USER DATA.

3. When the user asks about spending or budgeting:
   - Compare income vs expenses
   - Identify high expense categories
   - Suggest improvement based on categories

4. When the user asks about savings:
   - Calculate potential savings = totalIncome − totalExpenses
   - Use savingsGoals to give goal-based suggestions

5. When the user asks about goals:
   - Show goal progress
   - Show amount left
   - Suggest monthly contribution

6. NEVER invent or assume any numbers.
7. NEVER ignore the user's real data.
8. When the question is NOT related to finance, answer normally.

FORMAT:
- Keep answers simple, clear, short
- Use bullet points when helpful
- Include calculations only when needed
`;

    const prompt = systemPrompt
      .replace("{{totalIncome}}", userData?.totalIncome || 0)
      .replace("{{incomeSources}}", JSON.stringify(userData?.incomeSources || []))
      .replace("{{totalExpenses}}", userData?.totalExpenses || 0)
      .replace("{{expenseCategories}}", JSON.stringify(userData?.expenseCategories || {}))
      .replace("{{totalSavings}}", userData?.totalSavings || 0)
      .replace("{{savingsGoals}}", JSON.stringify(userData?.savingsGoals || []));

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    console.log('Request URL:', url);

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt + "\nUser question: " + userMessage
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 512
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ]
    };

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response JSON:', data);

        if (response.status === 503) {
          console.log('Gemini overloaded, retrying...');
          attempt++;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            continue;
          } else {
            throw new Error(`API error: ${response.status} ${response.statusText} - ${data.error?.message || 'Unknown error'}`);
          }
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText} - ${data.error?.message || 'Unknown error'}`);
        }

        if (data.error) {
          throw new Error(`Gemini API error: ${data.error.message}`);
        }

        const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't understand that.";

        return botReply;
      } catch (err) {
        if (attempt >= maxRetries - 1) {
          console.error('Gemini API error after retries:', err);
          return `Error: ${err.message}`;
        }
        attempt++;
        console.log('Retrying due to error...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={[styles.chatContent, { paddingBottom: 80 }]}
        >
          <Text style={[styles.headerTitle, { color: theme.accentColor }]}>🤖 AI Assistant</Text>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[
                styles.msgBubble,
                msg.sender === "user" ? styles.userMsg : styles.botMsg,
              ]}
            >
              <Text style={[styles.msgText, { color: msg.sender === "user" ? theme.textColor : theme.secondaryTextColor }]}>{msg.text}</Text>
            </View>
          ))}
          {loading && (
            <View style={[styles.msgBubble, styles.botMsg]}>
              <Text style={[styles.msgText, { color: theme.secondaryTextColor }]}>Thinking... 🤔</Text>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputArea, { backgroundColor: theme.cardBackgroundColor, borderTopColor: theme.borderColor }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask me about your finances..."
            placeholderTextColor={theme.secondaryTextColor}
            style={[styles.input, { color: theme.textColor, borderColor: theme.borderColor }]}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.accentColor }]}
            onPress={handleSendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={[styles.sendBtnText, { color: theme.textColor }]}>{loading ? "..." : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  msgBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginVertical: 4,
  },
  userMsg: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botMsg: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
