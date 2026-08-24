# Voice Command Shopping Assistant Pro

A customer-ready, intelligent shopping assistant application powered by natural voice commands and smart suggestions. This project uses a microservices architecture to deliver a seamless, voice-first shopping experience.

---

## 🌟 Key Features

### 1. Prominent Voice Command Center
- **Hero Voice Area**: Prominent interactive microphone interface with stateful soundwave animations.
- **Multilingual Voice Support**: Speak naturally in English, Hindi (Devanagari), and Spanish.
- **Natural Variations Supported**: Handles complex phrasing like *"Add 2 litres of milk"*, *"I need 3 apples"*, and *"मेरी लिस्ट में 2 किलो आलू जोड़ो"*.

### 2. Intelligent NLP Engine
- **Local Machine Learning**: Runs a custom-trained Intent Classifier (TF-IDF + Logistic Regression) via ONNX Runtime locally without depending on costly cloud APIs.
- **Hindi Normalization**: Natively supports Hindi by translating Devanagari numerals and keywords to English on the fly before processing.

### 3. Smart "Recipe-to-Cart" & Suggestions
- **Recipe Extraction**: Say *"Recipe: Lasagna"* and the assistant automatically breaks it down and adds the necessary ingredients (Tomato Paste, Lasagna Sheets, Ricotta Cheese) to your list.
- **In-Store Mode**: Enlarged touch targets for convenient grocery shopping on mobile devices.

### 4. Professional PDF Invoices
- One-click order review and generation of professional, vector-formatted tax invoices using `jsPDF`.

---

## 🏗️ Architecture

The project is split into three primary services:
1. **Frontend (`/frontend`)**: A fast Vite + React Single Page Application that handles the Web Speech API and user interface.
2. **Core API (`/backend-java`)**: A Java Spring Boot application that acts as the primary API Gateway and persists your shopping list.
3. **NLP Engine (`/backend-python`)**: A Python Flask microservice that processes raw text via an ONNX model to extract intents, quantities, and items.

---

## 🚀 Running Locally

You will need three terminal windows to run all services simultaneously.

### 1. Start the Python NLP Service
```bash
cd backend-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python index.py
```
*(The NLP Engine runs on `http://localhost:5000`)*

### 2. Start the Java Spring Boot Backend
```bash
cd backend-java
./mvnw spring-boot:run
```
*(The Core API runs on `http://localhost:8080`)*

### 3. Start the Vite React Frontend
```bash
cd frontend
npm install
npm run dev
```
*(The UI runs on `http://localhost:5173`)*

---

## 📦 Deployment Ready
This project is configured to be easily deployable on platforms like Render, Vercel, or Railway out of the box.

## 📄 License
**Copyright (c) 2026 Pranjal Kr Shukla. All Rights Reserved.**
This code is provided strictly for hackathon evaluation purposes. Unauthorized copying, modification, distribution, or commercial use is strictly prohibited. See the `LICENSE` file for full terms.
