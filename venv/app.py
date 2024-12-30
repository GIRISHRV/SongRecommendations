import base64
import requests
from flask import Flask, request, jsonify

app = Flask(__name__)

SPOTIFY_CLIENT_ID = 'YOUR_SPOTIFY_CLIENT_ID'
SPOTIFY_CLIENT_SECRET = 'YOUR_SPOTIFY_CLIENT_SECRET'

def get_spotify_access_token():
    auth_response = requests.post(
        'https://accounts.spotify.com/api/token',
        data={
            'grant_type': 'client_credentials'
        },
        headers={
            'Authorization': f'Basic {base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()}'
        }
    )
    auth_response_data = auth_response.json()
    return auth_response_data['access_token']

@app.route('/recommendations', methods=['POST'])
def get_recommendations():
    data = request.json
    tracks = data.get('tracks', [])
    playlist_link = data.get('playlistLink', '')

    if playlist_link:
        try:
            playlist_id = playlist_link.split('/')[-1].split('?')[0]
            access_token = get_spotify_access_token()
            results = requests.get(
                f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks',
                headers={
                    'Authorization': f'Bearer {access_token}'
                }
            ).json()
            tracks = [{'artist': item['track']['artists'][0]['name'], 'track': item['track']['name']} for item in results['items']]
        except Exception as e:
            return jsonify({'error': 'Failed to fetch playlist. Please ensure the playlist is public and accessible.'}), 400

    # Prepare the prompt for the Gemini API
    prompt = "Please provide 16 song suggestions based on the following list of tracks. Each suggestion should closely match the genre, style, and energy of the original tracks. If the given track list includes genres like metal, rock, pop, hip-hop, or others, the suggestions should heavily reflect these genres, with emphasis on the musical characteristics (e.g., distorted guitars for metal, strong beats for hip-hop). If applicable, consider the popularity and influence of the songs in the same genre. The output should consist of no other text and should be given as Artist - Song, I heavily emphasize no other sentences or text!. Here are the tracks: \n"
    for track in tracks:
        prompt += f"{track['artist']} - {track['track']}\n"

    # Call the Gemini API
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        recommendations = response.text.split('\n')

        # Fetch metadata for each recommended track from Last.fm and Spotify
        recommendations_with_metadata = []
        access_token = get_spotify_access_token()
        for rec in recommendations:
            if ' - ' in rec:
                artist, track_name = rec.split(' - ', 1)
                response = requests.get(
                    'http://ws.audioscrobbler.com/2.0/',
                    params={
                        'method': 'track.getInfo',
                        'api_key': lastfm_api_key,
                        'artist': artist,
                        'track': track_name,
                        'format': 'json'
                    },
                    headers={'User-Agent': 'YourAppName/1.0'}
                )
                if response.status_code == 200:
                    track_info = response.json().get('track', {})
                    spotify_search_result = requests.get(
                        'https://api.spotify.com/v1/search',
                        params={
                            'q': f"track:{track_name} artist:{artist}",
                            'type': 'track',
                            'limit': 1
                        },
                        headers={
                            'Authorization': f'Bearer {access_token}'
                        }
                    ).json()
                    spotify_url = spotify_search_result['tracks']['items'][0]['external_urls']['spotify'] if spotify_search_result['tracks']['items'] else ''
                    image_url = track_info.get('album', {}).get('image', [{}])[-1].get('#text', '')

                    # Fetch image from Spotify if missing
                    if not image_url and spotify_search_result['tracks']['items']:
                        track_id = spotify_search_result['tracks']['items'][0]['id']
                        track_details = requests.get(
                            f'https://api.spotify.com/v1/tracks/{track_id}',
                            headers={
                                'Authorization': f'Bearer {access_token}'
                            }
                        ).json()
                        image_url = track_details['album']['images'][0]['url'] if track_details['album']['images'] else ''

                    recommendations_with_metadata.append({
                        'artist': artist,
                        'track': track_name,
                        'image': image_url,
                        'spotifyUrl': spotify_url
                    })
                else:
                    print(f"Error fetching metadata for {artist} - {track_name}: {response.status_code}, {response.text}")

        return jsonify(recommendations_with_metadata)

    except Exception as e:
        print('Error calling Gemini API:', e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=False)