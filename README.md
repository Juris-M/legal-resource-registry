# Jurism: Legal Resource Registry

## Contents

* [Legal referencing requirements](legal-referencing-requirements)
* [Machine-readable identifiers](machine-readable-identifiers)
* [Source files and tools](source-files-and-tools)
    * [Setting up](setting-up)
	* [Commands](commands)
	* [File format](file-format)
	* [Special cases](special-cases)
	    * [Omitting the court or jurisdiction element of abbreviations](omitting-the-court-or-jurisdiction-element-of-abbreviations)
	    * [Vendor-neutral court codes](vendor-neutral-court-codes)
	    * [Declined languages](declined-languages)
	    * [Alternative languages](alternative-languages)
* [Submitting changes](submitting-changes)
	

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

> ![](./assets/images/fork-button.png)

After forking the project, fetch your project address from your own project page to the clipboard:

> ![](./assets/images/get-address.png)

Use `git` with the project address to clone the project to a location of your choice:

```bash
    shell> git clone https://github.com/XXXXXXX/legal-resource-registry.git
```

Set the original “upstream” LRR project as a remote partner to your clone. (This makes is possible to keep your clone current with any upstream changes):

```bash
    shell> git remote add upstream https://github.com/Juris-M/legal-resource-registry.git
```

For good measure, issue the command to pull in upstream changes. You should issue this command each time you begin work in the clone, to be sure the upstream project has not changed in the meantime:

```bash
    shell> git pull upstream master
```

Enter the `scripts` subdirectory of the project folder, install dependencies, and link the maintenance script (`jurisupdate`) to your command environment:

```bash
    shell> cd legal-resource-registry/scripts
    shell> npm install
    shell> npm link
```

At this point, running the `jurisupdate` command should yield the following error:

```bash
    shell> jurisupdate
    ERROR: path.dataDir is undefined in /MY/HOME/DIRECTORY/.jurisUpdate
```

The final step in setup is to set several path names in the `.jurisUpdate` configuration
file shown in the error message, using a text editor. The file content will initially look
like this, with a `null` value for two paths:

```javascript
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

```bash
    shell> jurisupdate
    Using /PATH/TO/legal-resource-registry/src as path for descriptive jurisdiction files
    ERROR: The -t option is required
```

If that all checks out, setup is complete and you’re ready to go.

### Commands

Running the `jurisupdate` command with the `-h` option will show its help text:

```bash
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

```bash
    shell> jurisupdate -t descriptive-to-compact -a
```

Alternatively, you can limit an update to a particular jurisdiction by setting its code with the `-j` option:

```bash
    shell> jurisupdate -t descriptive-to-compact -j vn
```

### File format

Source files are located in the `src` subdirectory of the LRR project folder. Its basic elements
are as follows (some additional features are explained in the next section of this README).

> ![](./assets/images/sample-1.png)

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

* Abbreviations that sometimes omit the court or jurisdiction element;
* Citations in declined languages (such as Russian, Czech, or Polish);
* Citations cast in alternative languages (i.e. an English versus a French form); and
* Citation using vendor-neutral court codes.

#### Omitting the court or jurisdiction element of abbreviations

In federal jurisdictions such as the United States, it may happen that
courts of a particular name exist both at the national level and in
its subunits. In this case, either the court or jurisdiction element
may be omitted from the abbreviation used in citations. In US
citations, the former is common, the latter rather rare. The following
examples are drawn from the [Indigo Book]() (which I heartily
recommend as an alternative to the Bluebook for guidance on US
citation conventions).

* *Mattel, Inc. v. MCA Records, Inc.*, 296 F.3d 894, 908 (9th Cir.
2002)
* *Brown v. State*, 216 S.E.2d 356, 356 (Ga. Ct. App. 1975)

To omit the court name from a target court’s abbreviation, prefix
its court ID with a minus sign (`-`) in the `"jurisdictions"` object:

```javascript
{
  "path": "us/c9",
  "name": "Ninth Circuit",
  "courts": [
    "bankruptcy.appellate.panel",
    "-court.appeals"
  ],
  "abbrev": "9th Cir."
}
```

To achieve the opposite effect, and force use of the court abbreviation
while suppressing the jurisdiction, use a plus sign (`+`):

```javascript
{
  "path": "us/fed",
  "name": "Federal",
  "courts": [
    …
    "+attorney.general",
	…
  ]
}
```

#### Vendor-neutral court codes

Through the 20th century, official publication of court judgments in
many common-law jurisdictions was channeled through private
publishers, with the result that their commercial products became
essential tools for the practice of law. Electronic document systems
introduced a new vector of competition, and in the United States this
lead to the curious case of West Publishing v. Mead Data Center, 799
F.2d 1219 (8th Cir. 1986), in which the firm in control of canonical
repositories on which official citations were based sued a new entrant
over copyright … in page numbering … as and early move in a struggle
for market control that continues to this day. [1]

In response to proposals by librarians, academics, and professional
associations, several jurisdictions have adopted “vendor-neutral”
citation forms for court judgments, assigned immediately upon
publication by the court. The specific form varies by jurisdiction,
but vendor-neutral citations typically make use of a court “key” that
differs from the abbreviated court name in other, coexisting forms
of citation.

To add court keys to a `"courts"` object, set them on an `"ABBREV"`
(all-caps) element:

```javascript
"ewca": {
  "name": "Court of Appeal",
  "abbrev": "CA",
  "ABBREV": "EWCA"
}
```

Style modules (documented separately) can access this special
key as appropriate when generating vendor-neutral citations.

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

```javascript
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

#### Alternative languages

Approximately 57 countries have [more than one official
language](https://www.quora.com/How-many-countries-in-the-world-have-more-than-one-official-language). In
addition, it is a common practice in Western publishing to romanize or
translate court names from certain language domains with non-roman
scripts. To cope with these requirements, Jurism styles can declare
a preferred citation variant for legal references, and the variant
will be preferred when applying abbreviations (and citation styling).

In the jurisdiction/court source files documented here, a variant
form can be set as in the following examples. In a `"courts"` object:

```javascript
"koto.saibansho": {
  "name": "高等裁判所",
  "abbrev": "<高等裁判所",
  "abbrev:englished": "< High Court"
}
```

And in a `"jurisdictions"` object:

```javascript
{
  "path": "jp/hiroshima",
  "name": "広島",
  "courts": [
    "koto.saibansho"
  ],
  "abbrev": "広島",
  "abbrev:englished": "Hiroshima"
}
```

The modifier (“englished” in this example) must be consistent across
all entries, since the `descriptive-to-compact` transform will create
a separate set of abbreviations for every unique modifier that it
finds in the file.

As a side-note, the variant would be invoked in a style by setting a
declaraton like following immediately after the `cs:info` section of a
style (multiple jurisdiction preferences can be set as a
space-delimited list):

```xml
<locale>
  <style-options jurisdiction-preference="englished" />
</local>
```

## Submitting changes

If you have written your changes into a `git` clone of the Legal Resource
Registry as described in the [Setting up](#setting-up) section above, you
can submit your changes for general use by pushing them to your GitHub
account, and then filing a “pull request” to invite their adoption.
The first step is a one-liner at the command line (possibly followed by
entry of your GitHub user ID and password):

```bash
    shell> git commit -m "Update to Atlantis" -a
```

After pushing your changes, visit the Legal Resource Registry project in your GitHub account, and file a pull request:


![](./assets/images/pull-request.png)


Follow the instructions to complete the request, and we’ll be in touch!


— Frank Bennett, Nisshin City near Nagoya, Japan, August 24, 2019

------------------

[1] *See, e.g.* Georgia v. Public.Resource.Org Inc., SCOTUSblog, https://www.scotusblog.com/case-files/cases/georgia-v-public-resource-org-inc/ (*cert. granted* June 24, 2019).


