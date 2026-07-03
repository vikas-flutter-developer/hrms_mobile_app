const axios = require('axios');

async function test() {
  try {
    const aiResponse = await axios.post('http://127.0.0.1:8000/match', {
      job_description: "Software Engineer",
      resumes: ["", "I am an experienced React developer.", "John Doe, Cashier at McDonalds. I love burgers."]
    });
    console.log(aiResponse.data);
  } catch (err) {
    console.error(err.message);
  }
}
test();
