// TODO
// Add set logos

const API_DELAY_MS = 100;

const textarea = document.querySelector('textarea');
const button = document.querySelector('button');
const resultDiv = document.getElementById('result');

function later(delay) {
  return new Promise(function (resolve) {
    setTimeout(resolve, delay);
  });
}

// setAndId being in the format "xln/96" or "xln/96/fr"
function getCard(setAndId) {
  return fetch(`https://api.scryfall.com/cards/${setAndId}`).then((res) =>
    res.json()
  );
}

function getCardPrints(cardJson) {
  return fetch(cardJson.prints_search_uri)
    .then((res) => res.json())
    .then((json) => json.data)
    .then((cards) => cards.filter((card) => card.games.includes('paper')))
    .then((cards) =>
      cards.map((card) => ({
        card: {
          oracle_id: card.oracle_id,
          name: card.name,
          printed_name: cardJson.printed_name,
          set: card.set,
          collector_number: card.collector_number,
        },
        set: {
          set: card.set,
          set_name: card.set_name,
          released_at: card.released_at,
          scryfall_set_uri: card.scryfall_set_uri,
          set_uri: card.set_uri,
        },
      }))
    );
}

function getCardPrintsFromSetAndId(setAndId) {
  return getCard(setAndId).then((card) => getCardPrints(card));
}

function getSetsMap(cardsIds) {
  return Promise.all(
    cardsIds.map((card, i) =>
      later(i * API_DELAY_MS).then(() => getCardPrintsFromSetAndId(card))
    )
  )
    .then((cards) => cards.flat())
    .then((cards) => Map.groupBy(cards, (cardSet) => cardSet.set.set));
}

function formatMap(setMap) {
  var result = '';
  const sortedMapKeys = [...setMap.keys()]
    .map((key) => ({ set: key, date: setMap.get(key)[0].set.released_at }))
    .sort((pairA, pairB) => -('' + pairA.date).localeCompare(pairB.date))
    .map((pair) => pair.set);

  sortedMapKeys.forEach((key) => {
    const cards = setMap.get(key);
    const set = cards[0].set;
    result += `${set.set.toUpperCase()} - ${set.set_name} (${
      set.released_at.split('-')[0]
    })\n`;

    cards
      .sort((cardA, cardB) =>
        ('' + cardA.card.collector_number)
          .padStart(5, '0')
          .localeCompare(('' + cardB.card.collector_number).padStart(5, '0'))
      )
      .forEach((card) => {
        const cardNumber =
          `${card.card.set}/${card.card.collector_number}`.padEnd(12, ' ');
        result += `  [ ] ${cardNumber} ${card.card.name}${
          card.card.printed_name ? ' - ' + card.card.printed_name : ''
        }\n`;
      });

    result += '\n';
  });

  return result;
}

function formatMapHtml(setMap) {
  var result = '';
  // Old sort, by date
  /*
  const sortedMapKeys = [...setMap.keys()]
    .map((key) => ({ set: key, date: setMap.get(key)[0].set.released_at }))
    .sort((pairA, pairB) => -('' + pairA.date).localeCompare(pairB.date))
    .map((pair) => pair.set);
  */

  // New sort, by nb of cards
  const sortedMapKeys = [...setMap.keys()]
    .map((key) => ({ set: key, size: setMap.get(key).length }))
    .sort((pairA, pairB) => pairB.size - pairA.size)
    .map((pair) => pair.set);

  const cardOracleIdsSet = new Set();

  sortedMapKeys.forEach((key) => {
    const cards = setMap.get(key);
    const set = cards[0].set;
    result += `<h2><a href="${set.scryfall_set_uri}" target="blank">
    ${set.set.toUpperCase()} - ${set.set_name}
    (${set.released_at.split('-')[0]})
    </a></h2>
    <ul>`;

    cards
      .sort((cardA, cardB) =>
        ('' + cardA.card.collector_number)
          .padStart(5, '0')
          .localeCompare(('' + cardB.card.collector_number).padStart(5, '0'))
      )
      .forEach((card) => {
        var oracleId = '';
        if (!!card.card.oracle_id) {
          oracleId = 'oracle_' + card.card.oracle_id.replaceAll('-', '');
          cardOracleIdsSet.add(oracleId);
        }

        const cardNumber = `${card.card.set.toUpperCase()}/${
          card.card.collector_number
        }`;
        result += `<li><label><input type="checkbox" class="${oracleId}">
        ${cardNumber}&emsp; ${card.card.name}${
          card.card.printed_name ? ' - ' + card.card.printed_name : ''
        }
        </label></li>`;
      });

    result += '</ul>';
  });

  resultDiv.innerHTML = result;

  // Linking all same cards' checkboxes together
  cardOracleIdsSet.forEach((cardId) => {
    const checkboxes = document.querySelectorAll(`.${cardId}`);

    checkboxes.forEach(function (checkbox) {
      checkbox.addEventListener('change', function (event) {
        checkboxes.forEach(function (checkbox) {
          checkbox.checked = event.target.checked;
        });
      });
    });
  });
}

function readInput() {
  const value = textarea.value
    .split('\n')
    .map((str) => str.trim())
    .filter((str) => !!str);

  if (value.length > 0) {
    getSetsMap(value).then(formatMapHtml);
  }
}

button.addEventListener('click', readInput);
