document.getElementById('file-input').addEventListener('change', function() {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const recommendButton = document.getElementById('recommend-button');
    const playlistLink = document.getElementById('playlist-link');

    if (fileInput.files.length > 0) {
        fileName.textContent = `Selected file: ${fileInput.files[0].name}`;
        recommendButton.disabled = false;
        playlistLink.value = ''; // Clear playlist link if file is selected
    } else {
        fileName.textContent = '';
        recommendButton.disabled = true;
    }
});

document.getElementById('playlist-link').addEventListener('input', function() {
    const playlistLink = document.getElementById('playlist-link');
    const recommendButton = document.getElementById('recommend-button');
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');

    if (playlistLink.value.trim() !== '') {
        recommendButton.disabled = false;
        fileInput.value = ''; // Clear file input if playlist link is provided
        fileName.textContent = ''; // Clear file name if playlist link is provided
    } else {
        recommendButton.disabled = true;
    }
});

document.getElementById('recommend-button').addEventListener('click', function() {
    console.log('Recommend button clicked');
    const fileInput = document.getElementById('file-input');
    const fileInputLabel = document.querySelector('.file-input-label');
    const recommendButton = document.getElementById('recommend-button');
    const spinner = document.getElementById('spinner');
    const generateAgainButton = document.getElementById('generate-again-button');
    const generateMoreButton = document.getElementById('generate-more-button');
    const fileName = document.getElementById('file-name');
    const playlistLink = document.getElementById('playlist-link');
    const file = fileInput.files[0];
    const link = playlistLink.value.trim();

    // Disable buttons and inputs
    fileInput.disabled = true;
    fileInputLabel.style.backgroundColor = '#555';
    fileInputLabel.style.cursor = 'not-allowed';
    recommendButton.disabled = true;
    recommendButton.style.backgroundColor = '#555';
    recommendButton.style.cursor = 'not-allowed';
    playlistLink.disabled = true;

    // Show spinner
    spinner.style.display = 'flex';

    const baseUrl = window.location.origin;

    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            console.log('File read successfully');
            const fileContent = event.target.result;
            console.log('File content:', fileContent);
            const tracks = parseFileContent(fileContent);
            console.log('Parsed tracks:', tracks);
            getRecommendations(tracks, baseUrl)
                .then(recommendations => {
                    console.log('Received recommendations:', recommendations);
                    displayRecommendations(recommendations);
                    // Hide spinner
                    spinner.style.display = 'none';
                    // Show generate again button and generate more button
                    generateAgainButton.style.display = 'inline-block';
                    generateMoreButton.style.display = 'inline-block';
                    // Start countdown for generate again button
                    startCooldown(generateAgainButton, cooldownTime, 'Generate Again');
                })
                .catch(error => {
                    console.error('Error fetching recommendations:', error);
                    alert('Failed to get recommendations. Please try again.');
                    // Hide spinner
                    spinner.style.display = 'none';
                });
        };
        reader.readAsText(file);
    } else if (link) {
        fetch(`${baseUrl}/playlist-details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ playlistLink: link })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            const { playlistName, tracks } = data;
            fileName.textContent = `Selected playlist: ${playlistName}`;
            getRecommendations(tracks, baseUrl)
                .then(recommendations => {
                    console.log('Received recommendations:', recommendations);
                    displayRecommendations(recommendations);
                    // Hide spinner
                    spinner.style.display = 'none';
                    // Show generate again button and generate more button
                    generateAgainButton.style.display = 'inline-block';
                    generateMoreButton.style.display = 'inline-block';
                    // Start countdown for generate again button
                    startCooldown(generateAgainButton, cooldownTime, 'Generate Again');
                })
                .catch(error => {
                    console.error('Error fetching recommendations:', error);
                    alert('Failed to get recommendations. Please try again.');
                    // Hide spinner
                    spinner.style.display = 'none';
                });
        })
        .catch(error => {
            console.error('Error fetching playlist details:', error);
            alert('Failed to fetch playlist details. Please ensure the playlist is public and accessible.');
            // Hide spinner
            spinner.style.display = 'none';
        });
    } else {
        alert('Please upload a file or enter a playlist link.');
        // Hide spinner
        spinner.style.display = 'none';
    }
});

let generateMoreClickCount = 0;
let cooldownTime = 30000; // Initial cooldown time in milliseconds (30 seconds)

document.getElementById('generate-more-button').addEventListener('click', function() {
    const baseUrl = window.location.origin;
    const recommendationsDiv = document.getElementById('recommendations');
    const existingTracks = Array.from(recommendationsDiv.children).map(item => ({
        artist: item.querySelector('p').textContent,
        track: item.querySelector('h4').textContent
    }));

    // Show spinner
    const spinner = document.getElementById('spinner');
    spinner.style.display = 'flex';

    // Disable the button and start the countdown
    const generateMoreButton = document.getElementById('generate-more-button');
    generateMoreButton.disabled = true;
    startCooldown(generateMoreButton, cooldownTime, 'Generate 10 More');

    getRecommendations(existingTracks, baseUrl)
        .then(recommendations => {
            console.log('Received more recommendations:', recommendations);
            appendRecommendations(recommendations);
            // Hide spinner
            spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error fetching more recommendations:', error);
            alert('Failed to get more recommendations. Please try again.');
            // Hide spinner
            spinner.style.display = 'none';
        });

    // Increase the cooldown time for the next click
    generateMoreClickCount++;
    cooldownTime = 30000 * Math.pow(2, generateMoreClickCount - 1); // Exponential increase
});

document.getElementById('generate-again-button').addEventListener('click', function() {
    const generateAgainButton = document.getElementById('generate-again-button');
    if (generateAgainButton.dataset.reloadAfterCooldown === 'true') {
        location.reload();
    } else {
        generateAgainButton.disabled = true;
        startCooldown(generateAgainButton, cooldownTime, 'Generate Again');
    }
});

function startCooldown(button, cooldownTime, originalText) {
    let remainingTime = cooldownTime / 1000; // Convert to seconds
    button.textContent = `Wait ${remainingTime}s`;
    button.style.backgroundColor = '#555';
    button.style.cursor = 'not-allowed';
    button.disabled = true;

    const interval = setInterval(() => {
        remainingTime--;
        button.textContent = `Wait ${remainingTime}s`;

        if (remainingTime <= 0) {
            clearInterval(interval);
            button.textContent = originalText;
            button.style.backgroundColor = '#1DB954';
            button.style.cursor = 'pointer';
            button.disabled = false;
            button.dataset.reloadAfterCooldown = 'true';
        }
    }, 1000);
}

function parseFileContent(content) {
    // Example function to parse file content into an array of tracks
    // Assuming each line in the file is in the format "artist - track"
    return content.split('\n').map(line => {
        const [artist, track] = line.split(' - ');
        return { artist, track };
    });
}

function getRecommendations(tracks, baseUrl) {
    return fetch(`${baseUrl}/recommendations`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tracks: tracks })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    });
}

function displayRecommendations(recommendations) {
    const recommendationsSection = document.querySelector('.recommendations-section');
    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.innerHTML = ''; // Clear previous recommendations

    if (Array.isArray(recommendations)) {
        recommendations.forEach(rec => {
            const imageUrl = rec.image ? rec.image : 'static/images/missing.jpg';
            const recElement = document.createElement('div');
            recElement.className = 'item';
            recElement.innerHTML = `
                <a href="${rec.spotifyUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                    <img src="${imageUrl}" alt="${rec.track}">
                    <h4>${rec.track}</h4>
                    <p>${rec.artist}</p>
                </a>
            `;
            recommendationsDiv.appendChild(recElement);
        });
        recommendationsSection.style.display = 'block'; // Show recommendations section
    } else {
        console.error('Recommendations is not an array:', recommendations);
    }
}

function appendRecommendations(recommendations) {
    const recommendationsDiv = document.getElementById('recommendations');

    if (Array.isArray(recommendations)) {
        recommendations.forEach(rec => {
            const imageUrl = rec.image ? rec.image : 'static/images/missing.jpg';
            const recElement = document.createElement('div');
            recElement.className = 'item';
            recElement.innerHTML = `
                <a href="${rec.spotifyUrl}" target="_blank" style="text-decoration: none; color: inherit;">
                    <img src="${imageUrl}" alt="${rec.track}">
                    <h4>${rec.track}</h4>
                    <p>${rec.artist}</p>
                </a>
            `;
            recommendationsDiv.appendChild(recElement);
        });
    } else {
        console.error('Recommendations is not an array:', recommendations);
    }
}