
function Testing() {

	function clicked() {
		console.log("Test button clicked");
	}

  return (
	<div>
		<button onClick={clicked}>
		Send Hello
      </button>
	</div>
  )
}

export default Testing
