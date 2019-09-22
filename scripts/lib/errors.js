function handleError(e, verbose) {
	if (verbose) {
		console.log(e);
	} else {
		console.log("ERROR: " + e.message);
		console.log(e);
	}
	process.exit();
}

module.exports = {
	handleError: handleError
}
