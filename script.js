function randomPlaceId() {
  return Math.floor(Math.random() * 9000000000) + 100000000;
}

function roll() {
  const result = document.getElementById("result");
  const play = document.getElementById("play");

  play.style.display = "none";

  let count = 0;
  const interval = setInterval(() => {
    result.textContent = randomPlaceId();
    count++;

    if (count > 20) {
      clearInterval(interval);

      const finalId = randomPlaceId();
      result.textContent = "ID : " + finalId;

      play.href = "https://www.roblox.com/games/" + finalId;
      play.style.display = "block";
    }
  }, 70);
}
