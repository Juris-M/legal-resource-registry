# Jurism: Legal Resource Registry

This repository is one part of the [Jurism](https://juris-m.github.io/downloads) reference manager project, a variant of Zotero that supports legal and multilingual research and writing. As outlined below, jurisdiction and court identifiers are central to the project’s objectives. The notes here are aimed at Jurism users who need to extend or improve jurisdictional coverage. In the instructions that follow the introductory notes below, it is assumed that the reader is comfortable with command-line tools and has a basic familiarity with [JSON syntax](https://en.wikipedia.org/wiki/JSON).

## Legal referencing requirements

By way of background, the special requirements for citation of legal resources have long been a barrier to the development of reference managers capable of handling this category of material. Legal information has a complex structure, and for clarity and accuracy, legal material should be cited in the form familiar to professionals in the target jurisdiction. This clashes with the "one size fits all" citation rules that guides such as MLA, APA, the Chicago Manual of Style apply to (what a lawyer would refer to as) secondary resources.

Properly automating citation forms across multiple jurisdictions requires, in the first instance, a system of machine-readable identifiers for each jurisdiction and (at minimum) the courts within it. These are useful for more than generating citations, of course: a properly composed identifier can concisely express the context of a resource within a hierarchy of authority, which is useful for organizing and interpreting materials.

## Machine-readable identifiers
 
 A standard system of machine-readable jurisdiction/court identifiers does not yet exist, so we are creating one for use in Jurism, loosely based on [a draft “URN:LEX” schema](https://datatracker.ietf.org/doc/draft-spinosa-urn-lex/) proposed to the IETF by Spinosa, Francesconi & Lupo in 2009. While not an official Internet standard, the proposal defines a clear and simple structure for identifers:

``` txt
    jp:fukuoka;hc
```

In the example above:

* `jp` identifies the top level of an independent jurisdiction (Japan in this case);
* `fukuoka` is a jurisdictional subdivision of its parent. Codes for subordinate jurisdictions are connected to their parent with a colon (`:`).
* `hc` is a court identifer (in this case 高等裁判所, or High Court). A court code is connected to its associated jurisdiction with a semicolon (`;`).
* The elements of an identifer must be written in roman characters (including optionally the period (`.`) and plus (`+`) characters—Latin-1 and other accented or non-roman chararacters are not allowed.

Apart from the constraints listed above, identifiers can be assigned arbitrarily; but once assigned, identifiers should not be changed. Accordingly, if you make local changes to the identifier system following the instructions below, it is important to submit your changes to the Jurism project, so that they can be adopted as a (de facto) standard for all users.

## Source files and tools

Identifiers and abbreviations are closely related. Both are defined in individual country-specific source files held in the [Legal Resource Registry](https://github.com/Juris-M/legal-resource-registry) (LRR), along with software tools used to deploy identifiers and abbreviations into the Jurism client. The LRR content is not shipped with the processor: it must be installed separately to manipulate the Jurism identifier system. 

To set up for editing the Jurism identifiers, you will need a [GitHub account](https://github.com/), and both [`git`](https://git-scm.com/) and [`nodejs`](https://nodejs.org/en/) must be installed on your local system. With those tools in place, let’s get started …

### Setting up

The first step in setting up is to fork the LRR project to your own GitHub account, by visiting [the LRR project page](https://github.com/Juris-M/legal-resource-registry) and clicking on the **Fork** button:

> ![](./fork-button.png)

After forking the project, fetch your project address from your own project page to the clipboard:

> ![](./get-address.png)

Use `git` with the project address to clone the project to a location of your choice:

``` bash
    shell> git clone https://github.com/XXXXXXX/legal-resource-registry.git
```

Enter the `scripts` subdirectory of the project folder, install dependencies, and link the maintenance script (`jurisupdate`) to your command environment:

``` bash
    shell> cd legal-resource-registry/scripts
    shell> npm install
    shell> npm link
```

At this point, running the `jurisupdate` command should yield the following error:

``` bash
    shell> jurisupdate
    ERROR: path.dataDir is undefined in /MY/HOME/DIRECTORY/.jurisUpdate
```

The final step in setup is to set several path names in the `.jurisUpdate` configuration
file shown in the error message, using a text editor. The file content will initially look
like this, with a `null` value for two paths:

``` javascript
{
  "path": {
    "dataDir": null,
    "jurisSrcDir": null,
    "configFile": "/home/bennett/.jurisUpdate"
  }
}
```

The paths should be set as follows:

> **dataDir**
> * Set `dataDir` as the path to your Jurism data directory. You can find the
>   directory path in the Jurism client via Preferences﻿→Advanced﻿→Files & Folders.

> **jurisSrcDir**
> * Set `jurisSrcDir` as the path to the `src` subdirectory of your cloned copy
>   of the LRR.

With these adjustments in place, the `jurisupdate` command should return the following
error message:

``` bash
    shell> jurisupdate
    Using /PATH/TO/legal-resource-registry/src as path for descriptive jurisdiction files
    ERROR: The -t option is required
```

If that all checks out, setup is complete and you’re ready to go.

### Commands

Running the `jurisupdate` command with the `-h` option will show its help text:

``` bash
    shell> jurisupdate -h
    Using /PATH/TO/legal-resource-registry/src as path for descriptive jurisdiction files
    Usage: jurisupdate <options>
        -t, --transform
           Data transformation to perform. Valid values are:
               db-to-compact
               compact-to-descriptive
               descriptive-to-compact
        -a, --all
           Perform requested operation on all jurisdictions.
        -j <jurisdictionID>, --jurisdiction=<jurisdictionID>
           Perform requested operation on the specified jurisdiction.
        -l, --list
           List codes for all international organizations and countries
        -F --force
           Force overwrite of same data for descriptive-to-compact.
```

To make changes to the Jurism identifier system, you will edit source files in the LRR,
and run the following command to make your changes available when the Jurism client is
(re)started:

``` bash
    shell> jurisupdate -t descriptive-to-compact -a
```

Alternatively, you can limit an update to a particular jurisdiction by setting its code with the `-j` option:

``` bash
    shell> jurisupdate -t descriptive-to-compact -j vn
```

### File format

Source files are located in the `src` subdirectory of the LRR project folder. Its basic elements
are as follows (some additional features are explained in the next section of this README).

> ![](./sample-1.png)

1. The `"courts"` element is JSON object with keys for each court ID. The `"jurisdictions"` element is an array of objects, each defining a particular jurisdiction, with parent jurisdictions listed before their subordinates.
2. The keys under `"courts"` are composed of roman characters only (periods and plus [+] characters are also allowed, spaces are not permitted).
3. A `"name"` is set on each court object. The name should be expressed in the primary language of the jurisdiction. This name will be shown in the Jurism UI, when the user clicks at the right end of the **Court** field for a list of available courts within a selected jurisdiction.
4. An `"abbrev"` element should be set on each court object. This will be used to compose court names. As shown in the `< Ct. App.` entry in the sample, a less-than symbol (`<`) at the left end of the string indicates that the jurisdiction abbreviation should be set at the front of the court abbreviation when composing the full abbreviation for a subordinate court. A greater-than symbol (`>`) at the right end of the string indicates that the jurisdiction should be post-pended.
5. The `"path"` element of a jurisdiction object expresses the jurisdiction identifier, delimited by slash characters (`/`) rather than colon. The elements of the identifier must be written in roman characters only (periods are allowed, spaces are not permitted).
6. Just as for courts, the `"name"` element of a jurisdiction object is used in the Jurism UI, and the `"abbrev"` element is used to compose abbreviations for use in citations. If an `"abbrev"` element is not set on a jurisdiction, the `"name"` value will be used.
7. The `"courts"` element of a jurisdiction object is an array of keys corresponding to entries in the top-level `"courts"` object.

This structure covers requirements for most jurisdictions. Tweaks may be required for some jurisdictions or publishing vectors, and we now turn to those.

### Special cases

As described above, the “abbreviated” form of a court for citation purposes is the `"abbrev"` form of its `"courts"` object, optionally combined with the `"name"` or `"abbrev"` form of its `"jurisdictions"` object. There are three cases that are not quite captured by this scheme:

* Citations in declined languages (such as Russian, Czech, or Polish);
* Citations cast in alternative languages (i.e. an English versus a French form); and
* Citation using vendor-neutral court codes.

#### Declined languages

Declined languages are those in which the form of a noun varies according
to context. For example, consider the following Polish case reference:

> Wyrok, Sąd Apelacyjny w Warszawie, Feb. 28, 2017, I ACa 2383/15.

In this reference, “Wyrok” indicates that the reference is to a court
judgment.  The docket number of the case is “I ACa 2383/15,” and the
date is rendered in English. The court name here, if translated into
English, would be “Court of Appeals in Warsaw.” In Polish grammar, the
place name following “w” (“in”) is set in locative case, and so is
written “Warszawie” rather than in nominative case as “Warszaw.”

In the Jurism UI, the jurisdiction name should display as nominative
“Warszaw,” but the form must be “w Warszawie” for citation purposes.
This is accomplished with the following pattern in the
`"jurisdiction"` object:

``` javascript
{
  "path": "pl/warsaw",
  "name": "Warszaw",
  "courts": [
    "sa",
    "wsa"
  ],
  "abbrev": "w Warszawie"
}
```

