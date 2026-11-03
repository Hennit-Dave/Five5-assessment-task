# Task 3: The Interview Defence (`docs/interview-answers.md`)

Each numbered answer has 200 words. The additional question covers user enumeration and recovery codes.

---

## Validation (Questions 1–5)

### 1. Why is client-side validation not enough?
When I fill in a form, the browser can tell me immediately that I missed a field. That saves me from sending a request, waiting for a response, and then working out what went wrong. At Nit's Cut, a customer who leaves the signup password empty hears an instruction about choosing a password. That feedback is worth keeping.

The limit is where the check runs. I control my browser. I can change the page, turn off JavaScript, or send the same request from another program. The server receives a request in each case. It cannot assume that the person sending it ever saw the signup page.

I demonstrated this with a direct request to our prototype. I sent a single letter as the name, an invalid email address, a short password, and no agreement to the terms. The server returned HTTP 200 and displayed the submitted details. That response showed the route accepted the request and rendered a result. It did not show that an account was created.

I would keep the browser checks for immediate feedback and enforce the signup rules again on the server before any account could be created or any invalid information could enter the database.

---

### 2. What security checks belong in the frontend, and what must the server enforce regardless?
In the frontend I want customers to understand what the shop needs from them. On signup I can check an email address as someone types, explain the password length, and show which field needs attention. On login I can wait until submission to flag a malformed address. Repeated warnings while someone is still typing an existing address would get in their way.

The server has a different job. It decides whether the requested operation may happen. For signup it must check the submitted fields, their types and lengths, the email format, and acceptance of the terms. A production account service would store a suitable password hash and keep passwords out of application logs. A screen that says a password is long enough gives the server no proof about the value that actually arrived.

There are also decisions only the server can make reliably. If a tailor asks to edit an order, the server must identify the person making that request and check their permission for that particular order. A hidden edit link provides no such check. I would test by sending the same operation from an account without permission and then checking that the order still contains its original values.

---

### 3. The user interface hides the delete button for non-administrators. Is that enough?
No. Hiding the delete button makes the interface clearer for someone who cannot delete orders. It also helps prevent accidental clicks. The server still needs to decide whether the person making a deletion request has permission to carry it out.

Imagine a customer viewing an order in Nit's Cut. They can see their order number. If they learn the address of a deletion endpoint, they can send it a request directly. They can also replace their order number with somebody else's. Neither action requires finding a button. In our signup exercise I used that same separation between page and endpoint to send values the form would have rejected.

For a real deletion feature, I would check the session first, then look up whether that person may delete the specified order. A customer should never gain that permission by sending a field that says they are an administrator. The decision must happen before the database is changed.

I would test this with fictional orders and separate accounts. I would attempt deletion as a customer, inspect the response, and look up the order afterwards. I would also test an authorised administrator so the check protects the order while allowing the intended operation.

---

### 4. What is the difference between validation, encoding, and sanitisation?
Validation asks whether a value is acceptable for a particular job. In our signup form a password made entirely of spaces fails, even if it contains fifteen characters. A passphrase with spaces between words can pass. Silently deleting spaces from every password would change the secret the customer chose and could prevent them from signing in later.

Encoding matters when data is put somewhere else. Suppose a tailor writes a garment note containing an ampersand or angle brackets. When the app displays that note as text inside an HTML page, the template should escape characters that the browser could interpret as markup. The customer should see what the tailor wrote. The stored note can keep its original characters.

Sanitisation is useful when the application allows some markup. If customer notes could contain formatted HTML, a suitable sanitiser could preserve an allowed emphasis tag while removing unsafe elements and attributes. For ordinary tailoring notes, plain text is simpler.

I would also use parameterised queries when saving a note. Binding the note as a value separates it from the SQL command. That is a database safeguard in its own right. It does a different job from escaping text in an HTML template.

---

### 5. Why should you validate route parameters and query strings, not just the body?
An address is another place where a user can supply a value. Someone can type an address, edit a bookmarked link, or send a request with a command line tool. They do not have to choose one of the links I put on the page.

Nit's Cut has a simple example. The mode in the authentication address tells the app whether to show signup, login, or password reset. Those are the supported choices. If someone provides another value, the app falls back to login. I would test an unknown value by opening the address directly and checking which form and page title appear.

For an order lookup, the consequences can be more serious. I would check that an order identifier has the expected format before using it. Even a perfectly formatted identifier might belong to another customer, so I would separately check the user's permission to view that order. I would also bind the identifier as a query parameter when reading it from the database.

The same reasoning applies to a list of orders. If a query parameter controls the number of results, an upper limit prevents a request for an unreasonable page size from consuming resources other customers need.

---

## Architecture (Questions 6–7)

### 6. Explain what a single page application is, and how you make one discoverable by search engines.
A single page application lets someone move between views while the browser keeps the current document open. Our account screen uses that pattern on a small scale. Clicking Forgot your password changes the visible form, updates the address, and moves focus to the new heading. The server can also render the correct form when someone opens its address directly.

For search engines I would first decide which pages people should find. A public services page describing the kinds of senator wear the shop makes belongs in search. A customer's private fitting details belong behind access controls. In this project the authentication pages carry a noindex instruction. There is no business need to advertise password reset as a search result.

For a public page I would give it a stable address, a descriptive title, a clear heading, and ordinary links from other relevant pages. I would send useful text in the initial HTML so a visitor or crawler can understand the page before scripts run. A sitemap can help crawlers discover public addresses.

I would test by opening a service address directly with JavaScript disabled. The service description should still be readable, and a missing service should return the appropriate status.

---

### 7. What are the advantages and disadvantages of a single page application against a multi-page application?
I would choose between the two approaches by looking at what the customer needs to do next. Someone who opens Login and then remembers they need a password reset is making a small change of direction. Keeping both forms in one document makes that transition quick. In Nit's Cut we recorded the address changing as we switched forms and checked that switching produced no extra page request.

That convenience creates work for the developer. When the form changes, I need to update the title, move keyboard focus, and keep the address in sync. Pressing Back must restore the form the customer expects. A working mouse click alone would miss a problem where a screen reader user is still focused on the previous view.

A separate page can be a better fit for a service description a customer wants to share. The server can send a useful document on the first request, and ordinary links still work if JavaScript fails. The tradeoff is another navigation when the customer follows a link.

I would keep the account forms together and let the public pages have their own addresses. That gives our customers fast switching where it matters and simple navigation everywhere else.

---

## Accessibility (Questions 8–9)

### 8. Can you explain the four principles of the Web Content Accessibility Guidelines, with examples from your own work?
I remember the four principles by thinking about a customer trying to fix an field. Perceivable means the customer can detect the problem. On our form, the error includes a warning symbol and written guidance beside the field. A customer who cannot distinguish the border colour can still read what needs attention.

Operable means they can do something about it with the controls they use. In my keyboard test I could reach the Signup button while it was inactive. Pressing Enter with only Terms missing returned focus to the checkbox. I could reach the checkbox without using a mouse.

Understandable means the message fits the task. Our reset form originally spoke about accessing an account. During the retest I heard it ask me to enter my email address to request a password reset. That wording explains why the address is needed on that screen.

Robust means the controls communicate their meaning to software such as VoiceOver. We linked each error to its field and marked invalid fields programmatically. On Login I heard that Email was required on entry and heard the missing email instruction when I left it empty. Those observations show how the markup behaved during an actual task.

---

### 9. Discuss the importance of semantic HTML in the context of accessibility.
Semantic HTML lets me describe what each part of the page does. For example, a button inside a form already supports keyboard activation. A link with a real destination can take the customer to another page even when scripts are unavailable. If I draw boxes that only respond to mouse clicks, I have to rebuild those behaviours and can easily miss one.

The Terms checkbox in Nit's Cut is a useful example. The label tells the customer what they are agreeing to. The checkbox exposes whether it is checked, and the customer can change that state with Space. The Terms of Service link has its own destination so someone can read the terms before agreeing.

Good markup also makes it easier to add a specific piece of information. On Login, the email input has a label and is linked to its error message. When I tested with VoiceOver, I heard that Email was required and then heard the instruction after leaving it empty. The markup gives the screen reader information it can present as I move.

I would still test the complete interaction. A correctly labelled button can have a focus outline that is difficult to see against its background.

---

## The Engagement (Questions 10–11)

### 10. Tell me about a time when you disagreed with what a customer wanted to build.
While I was learning tailoring, a customer asked for two pieces of senator wear and wanted them ready on a particular date. My boss handled the conversation. We already had a lot of work due for delivery that day. I understood why the customer wanted a clear date, and I could see how much sewing the shop had already promised to finish.

My boss offered another delivery date, and the customer agreed to it. What stayed with me was how little we needed to change to reach an agreement. The customer could still order the two pieces they wanted. The part we needed to discuss was when the shop could realistically have them ready.

If I were taking that order myself, I would check what was already due before promising a date. I would explain that several customers were expecting their clothes that day, offer a date I believed I could meet, and ask whether it worked for them. I would record the date we agreed on. That experience shaped what I want from Nit's Cut. When I look at a new order, I want to see the work already promised so I can give the customer a realistic answer.

---

### 11. How would you explain to a non-technical executive why their AI implementation is not performing as expected?
I would start by asking the executive for one answer they expected the AI to get right and what happened. That gives us something concrete to investigate. For a tailoring shop, suppose a customer asks when their outfit will be ready and the assistant repeats the original date after a power outage delayed the work.

First I would check the order record with the tailor. If the revised date was never entered, we have found a problem with how the shop updates orders. If the record is correct, I would check which record the assistant received. It might have received an older note or details for a different order. If it received the right information, I would examine how it produced its answer.

I would explain the finding in terms of the decision the customer has to make. A confident answer with yesterday's date can cause someone to travel to the shop unnecessarily. When a date is unconfirmed, the assistant should say that and offer a way to check with the tailor.

Before expanding the system, I would test several delayed and completed orders against the tailor's records. I would show the executive which answers improved and which still failed.

---

## Assessment Work & Wrong-Answer Analysis (Questions 12–14)

### 12. One of your validation rules wrongly blocks a category of legitimate user. Name the rule, name the users, and defend the trade-off or say you got it wrong.
The rule I would reject is requiring a customer to enter at least two words in the Full Name field. We introduced it deliberately on a separate branch for the rollback exercise. It seemed like a simple way to catch incomplete names. Its weakness became clear when we tested a customer who uses a single name.

Our fictional customer was Dapo. We kept the same email, valid passphrase, and accepted Terms throughout the experiment. Before the change, Signup accepted Dapo and sent one request. With the two-word rule in place, the form asked for a first and last name, kept the button inactive, and sent no request. The customer could only get past that rule by entering something different from the name they use.

I got that tradeoff wrong in the experimental version. The shop needs a name it can use when speaking to the customer. A second word gives the tailor no assurance that the person is genuine. We reverted commit `360930d` and repeated the same test. Dapo could successfully submit again. The restored files also matched the starting version in Git. Those two checks showed both what changed in the repository and what the customer could do afterwards.

---

### 13. You sent a request directly to your own endpoint. Say exactly what happened and what it tells you about the eight rules you spent two days writing.
I sent a request directly to the signup endpoint of our local prototype. I supplied A as the name, not-an-email as the email address, and short as the password. I left out the Terms field. Sending the request with curl meant the browser never ran the signup checks or displayed the inactive button.

The server returned HTTP 200 and rendered a confirmation page. The page showed the submitted name and email and reported that Terms had not been accepted. A second request with empty name, email, and password also received HTTP 200. These responses show the prototype processed both requests. They do not establish that it created an account, stored a password, or sent an email.

The eight checks in our assessment include rules about the data and behaviour that belongs to the interface. A screen reader announcement or an inactive button can help a customer complete the form. A command line program has no reason to encounter either one. The first request demonstrated acceptance of malformed values. The second tested completely empty content separately.

In Task 4 I would enforce the relevant data rules in the server handler and repeat both requests to verify rejection before any account creation.

---

### 14. Wrong-Answer Analysis
The candidate has described some helpful form behaviour, then claimed it protects the whole application. A customer benefits when a form points out an invalid email address. A visible inactive button can also explain that something remains to be completed. Neither control gets a chance to run when a person sends a request directly to the endpoint.

We demonstrated that with our own signup form. A request containing a short password and malformed email reached the server even though the browser would have blocked the same values. The prototype returned HTTP 200. Adding another regular expression in the browser would leave that request unchanged.

The candidate mixes up different jobs. Validation checks whether a value makes sense for a field. Applying a strict expression to every name can exclude real customers. Stripping characters in the browser can also damage legitimate text, and anyone sending their own request can skip that step.

For a production service I would validate incoming values on the server before acting on them. I would use parameterised queries when storing data and escape customer text appropriately when displaying it in HTML. I would test each boundary separately because a passing form test cannot prove database safety.

---

## Additional Assessment Question: Sensitive Code Shape and User Enumeration

### How does form design prevent sensitive code shape disclosure and user enumeration attacks?

User enumeration means working out which people have accounts by comparing how a service responds. Imagine trying two addresses on a password reset form. If one response says the address is unknown and another says a message was sent, someone can use that difference to build a list of registered addresses.

In our prototype, two fictional email addresses received the same confirmation and HTTP status. The prototype does not look up accounts or send reset emails. In a live service I would also compare response times and test what a caller can observe when one address belongs to a real account.

The recovery code raised a different question. A six-digit example told anyone looking at the form what kind of guess to make. We removed the example and used guidance that directs the customer to their recovery message. Removing the hint leaves the underlying number of possible codes unchanged. A real recovery service would still need limits on guessing and a short expiry time for each code.
