import { useState } from 'react';
import { confirmImage, generateImage } from '../api/client';

export default function GenerateImagePage() {
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [accuracy, setAccuracy] = useState(80);
  const [improvements, setImprovements] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerate(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await generateImage(description, improvements);
      setImageUrl(result.imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      await confirmImage({ description, improvements, imageUrl, accuracy });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Generate an image of your lost item</h1>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleGenerate}>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the item" required />
        <button type="submit" disabled={loading}>{loading ? 'Generating...' : 'Generate image'}</button>
      </form>
      {imageUrl && <><img src={imageUrl} alt="AI-generated representation of the item" /><label>Accuracy: {accuracy}% <input type="range" min="0" max="100" value={accuracy} onChange={(e) => setAccuracy(Number(e.target.value))} /></label><button onClick={handleConfirm} disabled={loading}>Confirm image</button></>}
    </main>
  );
}