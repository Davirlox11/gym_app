// utils/share.ts
interface ShareWorkoutParams {
  text: string;
  files: File[];
}

export async function shareWorkout({ text, files }: ShareWorkoutParams): Promise<void> {
  try {
    // Optimize text format for better caption detection
    const optimizedText = text.trim();
    
    // Primary method: Share files with text as caption
    if (files?.length && navigator.canShare?.({ files, text: optimizedText })) {
      await navigator.share({
        files: files,
        text: optimizedText
        // Removed title to increase chances text appears as caption
      });
      return;
    }

    // Alternative: Share with URL encoding for better Telegram compatibility
    if (files?.length && navigator.canShare?.({ files })) {
      // Create a URL that includes the text for Telegram
      const telegramUrl = `https://telegram.me/share/url?text=${encodeURIComponent(optimizedText)}`;
      
      await navigator.share({
        files: files,
        url: telegramUrl
      });
      return;
    }

    // Fallback: share only text
    await navigator.share({
      text: optimizedText
    });

    // If we have files but couldn't share them, inform user
    if (files?.length) {
      alert(
        "Il tuo browser non supporta la condivisione diretta di file.\n" +
        "Invia ora manualmente i video nella chat."
      );
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') {
      console.error("Share error:", err);
    }
    throw err; // Re-throw to let the calling function handle it
  }
}