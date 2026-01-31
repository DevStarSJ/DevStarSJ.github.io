---
layout: post
title: "Build Your Own AI Chatbot with Python and OpenAI API: Complete Tutorial"
subtitle: Step-by-step guide to creating a functional AI chatbot from scratch
categories: development
tags: python ai
comments: true
---

# Build Your Own AI Chatbot with Python and OpenAI API: Complete Tutorial

Creating your own AI chatbot has never been easier. In this comprehensive tutorial, we'll build a fully functional chatbot using Python and the OpenAI API. By the end, you'll have a working chatbot that you can customize and deploy.

## Prerequisites

Before we start, make sure you have:

- Python 3.8 or higher installed
- An OpenAI API key
- Basic Python knowledge
- A code editor (VS Code recommended)

## Project Setup

### Step 1: Create Project Directory

```bash
mkdir ai-chatbot
cd ai-chatbot
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 2: Install Dependencies

```bash
pip install openai python-dotenv streamlit
```

### Step 3: Create Project Structure

```
ai-chatbot/
├── .env
├── .gitignore
├── requirements.txt
├── chatbot.py
├── app.py
└── utils/
    └── __init__.py
```

### Step 4: Set Up Environment Variables

Create a `.env` file:

```
OPENAI_API_KEY=your-api-key-here
```

## Building the Core Chatbot

### Basic Chatbot Class

```python
# chatbot.py
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

class AIChatbot:
    def __init__(self, model="gpt-4-turbo-preview", system_prompt=None):
        """
        Initialize the AI Chatbot.
        
        Args:
            model: OpenAI model to use
            system_prompt: Custom system instructions
        """
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model
        self.system_prompt = system_prompt or "You are a helpful AI assistant."
        self.conversation_history = []
        
    def _build_messages(self, user_message):
        """Build the message list for the API call."""
        messages = [{"role": "system", "content": self.system_prompt}]
        messages.extend(self.conversation_history)
        messages.append({"role": "user", "content": user_message})
        return messages
    
    def chat(self, user_message, temperature=0.7, max_tokens=1000):
        """
        Send a message and get a response.
        
        Args:
            user_message: The user's input
            temperature: Creativity level (0-1)
            max_tokens: Maximum response length
            
        Returns:
            The assistant's response
        """
        messages = self._build_messages(user_message)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            assistant_message = response.choices[0].message.content
            
            # Update conversation history
            self.conversation_history.append(
                {"role": "user", "content": user_message}
            )
            self.conversation_history.append(
                {"role": "assistant", "content": assistant_message}
            )
            
            return assistant_message
            
        except Exception as e:
            return f"Error: {str(e)}"
    
    def clear_history(self):
        """Clear the conversation history."""
        self.conversation_history = []
        
    def get_history(self):
        """Get the conversation history."""
        return self.conversation_history
```

### Testing the Basic Chatbot

```python
# test_chatbot.py
from chatbot import AIChatbot

def main():
    # Initialize chatbot
    bot = AIChatbot(
        system_prompt="You are a friendly AI assistant who loves to help with coding questions."
    )
    
    print("AI Chatbot initialized. Type 'quit' to exit.\n")
    
    while True:
        user_input = input("You: ")
        
        if user_input.lower() == 'quit':
            print("Goodbye!")
            break
            
        response = bot.chat(user_input)
        print(f"\nAssistant: {response}\n")

if __name__ == "__main__":
    main()
```

## Adding Advanced Features

### Streaming Responses

```python
def chat_stream(self, user_message, temperature=0.7, max_tokens=1000):
    """
    Send a message and get a streaming response.
    
    Yields:
        Chunks of the response as they arrive
    """
    messages = self._build_messages(user_message)
    
    try:
        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield content
        
        # Update history after complete response
        self.conversation_history.append(
            {"role": "user", "content": user_message}
        )
        self.conversation_history.append(
            {"role": "assistant", "content": full_response}
        )
        
    except Exception as e:
        yield f"Error: {str(e)}"
```

### Function Calling (Tool Use)

```python
def chat_with_tools(self, user_message, tools, temperature=0.7):
    """
    Chat with function calling capabilities.
    
    Args:
        user_message: The user's input
        tools: List of tool definitions
        
    Returns:
        Response or function call information
    """
    messages = self._build_messages(user_message)
    
    response = self.client.chat.completions.create(
        model=self.model,
        messages=messages,
        tools=tools,
        tool_choice="auto",
        temperature=temperature
    )
    
    response_message = response.choices[0].message
    
    if response_message.tool_calls:
        return {
            "type": "function_call",
            "calls": [
                {
                    "name": call.function.name,
                    "arguments": call.function.arguments
                }
                for call in response_message.tool_calls
            ]
        }
    
    return {
        "type": "message",
        "content": response_message.content
    }
```

### Example Tool Definition

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get the current weather in a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "The city and state, e.g., San Francisco, CA"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"]
                    }
                },
                "required": ["location"]
            }
        }
    }
]
```

## Building a Web Interface with Streamlit

```python
# app.py
import streamlit as st
from chatbot import AIChatbot

st.set_page_config(
    page_title="AI Chatbot",
    page_icon="🤖",
    layout="wide"
)

st.title("🤖 AI Chatbot")
st.markdown("Powered by OpenAI GPT-4")

# Initialize session state
if "chatbot" not in st.session_state:
    st.session_state.chatbot = AIChatbot()
    
if "messages" not in st.session_state:
    st.session_state.messages = []

# Sidebar for settings
with st.sidebar:
    st.header("Settings")
    
    temperature = st.slider(
        "Temperature",
        min_value=0.0,
        max_value=1.0,
        value=0.7,
        step=0.1,
        help="Higher values make output more creative"
    )
    
    max_tokens = st.slider(
        "Max Tokens",
        min_value=100,
        max_value=4000,
        value=1000,
        step=100
    )
    
    if st.button("Clear Chat"):
        st.session_state.messages = []
        st.session_state.chatbot.clear_history()
        st.rerun()
    
    st.markdown("---")
    st.markdown("### System Prompt")
    system_prompt = st.text_area(
        "Customize the AI's behavior:",
        value="You are a helpful AI assistant.",
        height=100
    )
    
    if st.button("Update System Prompt"):
        st.session_state.chatbot = AIChatbot(system_prompt=system_prompt)
        st.success("System prompt updated!")

# Display chat messages
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if prompt := st.chat_input("Type your message here..."):
    # Add user message to display
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)
    
    # Get AI response
    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""
        
        # Stream the response
        for chunk in st.session_state.chatbot.chat_stream(
            prompt, 
            temperature=temperature,
            max_tokens=max_tokens
        ):
            full_response += chunk
            message_placeholder.markdown(full_response + "▌")
        
        message_placeholder.markdown(full_response)
    
    # Add assistant response to display
    st.session_state.messages.append(
        {"role": "assistant", "content": full_response}
    )
```

### Run the Web App

```bash
streamlit run app.py
```

## Adding Memory and Context

### Long-term Memory with Vector Database

```python
# memory.py
from openai import OpenAI
import numpy as np

class ChatMemory:
    def __init__(self):
        self.client = OpenAI()
        self.memories = []
        self.embeddings = []
        
    def add_memory(self, text):
        """Add a memory with its embedding."""
        embedding = self._get_embedding(text)
        self.memories.append(text)
        self.embeddings.append(embedding)
        
    def _get_embedding(self, text):
        """Get embedding for text."""
        response = self.client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    
    def search(self, query, top_k=3):
        """Search for relevant memories."""
        if not self.memories:
            return []
            
        query_embedding = self._get_embedding(query)
        
        # Calculate cosine similarity
        similarities = [
            np.dot(query_embedding, emb) / 
            (np.linalg.norm(query_embedding) * np.linalg.norm(emb))
            for emb in self.embeddings
        ]
        
        # Get top-k indices
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        return [self.memories[i] for i in top_indices]
```

### Integrating Memory with Chatbot

```python
class AIChatbotWithMemory(AIChatbot):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.memory = ChatMemory()
        
    def chat(self, user_message, temperature=0.7, max_tokens=1000):
        # Search for relevant memories
        relevant_memories = self.memory.search(user_message)
        
        # Add memories to context
        if relevant_memories:
            memory_context = "\n".join([
                f"- {mem}" for mem in relevant_memories
            ])
            enhanced_prompt = f"""Relevant context from previous conversations:
{memory_context}

User message: {user_message}"""
        else:
            enhanced_prompt = user_message
        
        response = super().chat(enhanced_prompt, temperature, max_tokens)
        
        # Save interaction to memory
        self.memory.add_memory(f"User: {user_message}")
        self.memory.add_memory(f"Assistant: {response}")
        
        return response
```

## Deploying Your Chatbot

### Option 1: Streamlit Cloud (Free)

1. Push code to GitHub
2. Connect to [share.streamlit.io](https://share.streamlit.io)
3. Deploy with one click

### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8501

CMD ["streamlit", "run", "app.py", "--server.port=8501"]
```

```bash
docker build -t ai-chatbot .
docker run -p 8501:8501 --env-file .env ai-chatbot
```

### Option 3: AWS/GCP/Azure

Deploy using cloud services for production-grade applications.

## Best Practices

1. **Rate Limiting**: Implement rate limiting to control costs
2. **Error Handling**: Always handle API errors gracefully
3. **Logging**: Log conversations for debugging
4. **Security**: Never expose API keys in client-side code
5. **Testing**: Write tests for your chatbot logic

## Conclusion

You've now built a fully functional AI chatbot with:

- ✅ Basic conversation capabilities
- ✅ Streaming responses
- ✅ Function calling
- ✅ Web interface
- ✅ Memory/context management
- ✅ Deployment options

The possibilities are endless—customize the system prompt, add more tools, integrate with your existing systems, and create unique AI experiences!

## Next Steps

- Add authentication for multi-user support
- Integrate with databases for persistent storage
- Add voice input/output capabilities
- Create specialized chatbots for specific domains

---

*Happy coding! 🚀*
