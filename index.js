// TODO
// Add set logos

const textarea = document.querySelector('textarea');
const button = document.querySelector('button');
const resultDiv = document.getElementById('result');

textarea.setAttribute('placeholder', `Supported syntax:\n\n` + syntaxText);

function getSetsMap(parsedCards) {
  // Assumes all cards are in the format EXT/000/ln
  const cardPrints = [];
  return getCardPrintsAndDo(parsedCards, (input, foundCards) => {
    if (foundCards !== undefined) {
      const prints = foundCards.map((card) => ({
        card: {
          oracle_id: card.oracle_id,
          name: card.name,
          printed_name: card.printed_name || card.name,
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
      }));
      cardPrints.push(...prints);
    } else {
      console.error(`An error occurred while fetching card "${input.name}"`);
      // TODO Handle error
    }
  })
    .then(() => Map.groupBy(cardPrints, (cardSet) => cardSet.set.set));
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
    const parsedCards = value.map((str) => parseMTGCardString(str));
    getSetsMap(parsedCards).then(formatMapHtml);
  }
}

button.addEventListener('click', readInput);
