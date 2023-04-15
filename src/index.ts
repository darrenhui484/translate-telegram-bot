import { Bot, Filter } from "grammy";
import * as DeepL from "deepl-node";
import * as cld from "cld";
import { VALID_LANGUAGES } from "./constants";
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

async function handleNewGeneralChannelMessage(message: string): Promise<string> {
  try {
    const highestScoringLanguage = await detectHighestScoringValidLanguage(message);
    const languageCode = highestScoringLanguage.code;
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

async function detectHighestScoringValidLanguage(messageContent: string) {
  const detectedLanguages = await cld.detect(messageContent);
  const highestScoringLanguage = getHighestScoringLanguage(detectedLanguages.languages);
  const languageCode = highestScoringLanguage.code;
  if (!VALID_LANGUAGES.includes(languageCode)) {
    throw new Error(`detected language not in ${VALID_LANGUAGES}`);
  }
  return highestScoringLanguage;
}

function getHighestScoringLanguage(detectedLanguages: Array<cld.Language>) {
  if (detectedLanguages.length <= 0) {
    throw new Error("no detected languages from cld");
  }
  let highestScoringLanguage = detectedLanguages[0];
  for (let i = 1; i < detectedLanguages.length; i++) {
    if (highestScoringLanguage.score < detectedLanguages[i].score) {
      highestScoringLanguage = detectedLanguages[i];
    }
  }
  return highestScoringLanguage;
}

bot.on("message:text", async (context) => {
  const translatedMessage = await handleNewGeneralChannelMessage(context.message.text);
  context.reply(translatedMessage);
});
bot.start();
