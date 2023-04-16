import { Bot } from "grammy";
import * as DeepL from "deepl-node";
import "dotenv/config";

const telegramApiKey = process.env.TELEGRAM_API_KEY;
if (telegramApiKey == null) {
  throw new Error("telegram api key does not exist");
}
const deeplApiKey = process.env.DEEPL_API_KEY;
if (deeplApiKey == null) {
  throw new Error("deepl api key does not exist");
}
const bot = new Bot(telegramApiKey);
const deeplTranslator = new DeepL.Translator(deeplApiKey);

// catches up on messages when bot it turned back on. This automatically skips to most recent
const resetURL = `https://api.telegram.org/bot${telegramApiKey}/getUpdates?offset=-1`;
async function resetBot() {
  const response = await fetch(resetURL);
  const jsonData = await response.json();
  console.log(jsonData);
}

async function handleNewMessage(
  message: string,
  detectLanguage: (message: string) => string | null
): Promise<string> {
  try {
    const languageCode = detectLanguage(message);
    if (languageCode === "en") {
      const textResult = await deeplTranslator.translateText(message, "en", "ru");
      return textResult.text;
    } else if (languageCode === "ru") {
      const textResult = await deeplTranslator.translateText(message, "ru", "en-US");
      return textResult.text;
    } else {
      return "language detected is not english or russian";
    }
  } catch (error) {
    if (!(error instanceof Error)) {
      return `unknown error ${JSON.stringify(error)}`;
    }

    return `${error.message}: ${message}`;
  }
}

const cyrillicMatcher = /\p{sc=Cyrillic}/gu;
const latinMatcher = /\p{sc=Latin}/gu;
function detectLanguage(message: string): "en" | "ru" | null {
  const cyrillicResults = message.match(cyrillicMatcher);
  const latinResults = message.match(latinMatcher);

  if (cyrillicResults != null && latinResults == null) {
    return "ru";
  }

  if (cyrillicResults == null && latinResults != null) {
    return "en";
  }

  if (cyrillicResults != null && latinResults != null) {
    if (cyrillicResults.length >= latinResults.length) {
      return "ru";
    }
    return "en";
  }
  return null;
}

async function main() {
  await resetBot();
  bot.on("message:text", async (context) => {
    const translatedMessage = await handleNewMessage(
      context.message.text,
      detectLanguage
    );
    context.reply(translatedMessage);
  });
  bot.start();
}

main();
