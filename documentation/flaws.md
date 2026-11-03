## Areas for improvement

1. **UI organization:**

    Both users noted that there was too much information on each tab and had trouble operating with the Week and Road tabs specifically. After seeing their trains of thought, I can conclude that the app needs to make this information much more compartimentalized. It made me think of how ChatGPT or Claude have a mainly blank screen when you start a new chat. I think my app needs more of that. 

    Some features, like the color legend and the semester table or the description of an event and the week, should be closer together to suggest correlation. However,I think the app would benefit in general from more buttons and less text upfront.

    **Why it occurs:** the Road page shows the legend, time-budget settings, compare table, semester grid and details all at once, and the Week page puts the add-category form below the grid.

    **Level:** physical

    **Severity:** major (both testers were overwhelmed and both needed a hint to find the cap and "Edit constraints")

2. **Vocabulary:**

    Users had to spend time trying to understand what a lot of the terminology meant. I think there needs to be more explanation of what some terms mean (reserve, soft, hard), and simplification of some others (least study time left, bussiest week).

    **Why it occurs:** the labels are my own wording and the app gives no explanation of them where they appear.

    **Level:** linguistic

    **Severity:** moderate (testers recovered, in one case after a hint)

3. **Forgot passwrd**

    Not hard to implement but its absence can have really bad effects like the complete "loss" of data on the users end who permanently loses access to their account. This is baisically a memory leak. 

    **Why it occurs:** the account system only supports registering, logging in and logging out, with no way to recover a forgotten password.

    **Level:** conceptual

    **Severity:** critical (the tester was locked out of her account and could not continue without my help)