function handleError(e, verbose) {
	if (verbose) {
		console.log(e);
	} else {
		console.log(e.message)
	}
	process.exit();
}

module.exports = {
	handleError: handleError
}
